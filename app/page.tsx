"use client"

// Dashboard principal para visualización y análisis de datos de coolers

// Importaciones de React y librerías de UI
import { useEffect, useState, useRef, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/table"
import { Badge } from "../components/ui/badge"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Brush, CartesianGrid } from "recharts"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { CustomPagination } from "../components/ui/custom-pagination"
import { Drawer, DrawerContent, DrawerClose } from "../components/ui/drawer"
import { useToast } from "../hooks/use-toast"
import { Toaster } from "../components/ui/toaster"
import { PieChartCoolers } from "../components/ui/pie-chart"
import { Skeleton } from "../components/ui/skeleton"
import { X } from "lucide-react"
import { saveAs } from "file-saver"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
// @ts-ignore
autoTable // This ensures the import is not removed as unused

// Optionally, if you want TypeScript types, install @types/jspdf-autotable and add:
// import "jspdf-autotable"

// Definición de la interfaz de datos de un cooler
interface CoolerData {
  _id?: string
  cooler_id: string
  door_opens: number
  open_time: number
  compressor: number
  power: number
  on_time: number
  min_voltage: number
  max_voltage: number
  temperature: number
  calday: string
}

// Componente principal del dashboard
export default function DashboardPage() {
  // Estados para datos, filtros, paginación y UI
  const [coolers, setCoolers] = useState<CoolerData[]>([])
  const [search, setSearch] = useState("")
  const [selectedCooler, setSelectedCooler] = useState<CoolerData | null>(null)
  const [page, setPage] = useState(1)
  const [rowsPerPage] = useState(10)
  const [filterTemp, setFilterTemp] = useState("")
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<{from: string, to: string}>({from: "", to: ""})
  const [selectedCoolers, setSelectedCoolers] = useState<string[]>([])
  const [eventLog, setEventLog] = useState<{type: string, message: string, date: string}[]>([])
  const tableRef = useRef<HTMLTableElement>(null)
  const { toast } = useToast()

  // Cargar datos de coolers desde la API al montar
  useEffect(() => {
    setLoading(true)
    fetch("/api/coolers")
      .then(res => res.json())
      .then(data => Array.isArray(data) ? setCoolers(data) : setCoolers([]))
      .finally(() => setLoading(false))
  }, [])

  // Filtros optimizados con useMemo
  const filtered = useMemo(() =>
    coolers.filter(c => {
      if (search && !(c.cooler_id.toLowerCase().includes(search.toLowerCase()) || c.calday.toLowerCase().includes(search.toLowerCase()))) return false;
      if (filterTemp && !c.temperature.toString().includes(filterTemp)) return false;
      if (dateRange.from && c.calday !== dateRange.from) return false;
      return true;
    })
  ,[coolers, search, filterTemp, dateRange.from])

  // Ordenamiento de columnas
  const [sortBy, setSortBy] = useState<string>("")
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc")
  function handleSort(col: string) {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortBy(col); setSortDir("asc") }
  }
  const sorted = [...filtered].sort((a, b) => {
    if (!sortBy) return 0
    const valA = a[sortBy as keyof typeof a]
    const valB = b[sortBy as keyof typeof b]
    if (typeof valA === "number" && typeof valB === "number")
      return sortDir === "asc" ? valA - valB : valB - valA
    return sortDir === "asc"
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA))
  })
  const paginated = sorted.slice((page-1)*rowsPerPage, page*rowsPerPage)

  // Métricas rápidas y tendencias
  const totalCoolers = coolers.length
  const totalDoorOpens = coolers.reduce((acc, c) => acc + (c.door_opens || 0), 0)
  const avgTemp = coolers.length ? (coolers.reduce((acc, c) => acc + (c.temperature || 0), 0) / coolers.length).toFixed(2) : 0
  const avgPower = coolers.length ? (coolers.reduce((acc, c) => acc + (c.power || 0), 0) / coolers.length).toFixed(2) : 0

  // Tendencias: compara con el día anterior si hay datos
  let trendTemp = 0, trendPower = 0, trendDoorOpens = 0
  if (coolers.length > 1) {
    const today = coolers[coolers.length-1]
    const yesterday = coolers[coolers.length-2]
    trendTemp = today.temperature - yesterday.temperature
    trendPower = today.power - yesterday.power
    trendDoorOpens = today.door_opens - yesterday.door_opens
  }

  // Alerta visual si algún cooler tiene temperatura fuera de rango
  useEffect(() => {
    if (coolers.length > 0) {
      const alert = coolers.find(c => c.temperature > 10 || c.temperature < 0)
      if (alert) {
        toast({
          title: "Alerta de temperatura",
          description: `Cooler ${alert.cooler_id} fuera de rango: ${alert.temperature}°C`,
          variant: "destructive"
        })
      }
    }
  }, [coolers, toast])

  // Exportar datos filtrados a CSV
  function exportToCSV() {
    const headers = ["ID","Cooler","Puertas","Tiempo Abierto","Compresor","Potencia","On Time","Min Volt","Max Volt","Temp","Fecha"]
    const rows = filtered.map(row => [
      row._id?.toString().slice(-6), row.cooler_id, row.door_opens, row.open_time, row.compressor, row.power, row.on_time, row.min_voltage, row.max_voltage, row.temperature, row.calday
    ])
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "coolers.csv"
    a.click()
    URL.revokeObjectURL(url)
  }
  // Exportar a Excel
  function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(filtered)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Coolers")
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" })
    saveAs(blob, "coolers.xlsx")
    setEventLog(log => [...log, {type: "export", message: "Exportación a Excel", date: new Date().toISOString()}])
  }
  // Exportar a PDF
  function exportToPDF() {
    const doc = new jsPDF()
    doc.text("Reporte de Coolers", 10, 10)
    autoTable(doc, {
      head: [["ID","Cooler","Puertas","Tiempo Abierto","Compresor","Potencia","On Time","Min Volt","Max Volt","Temp","Fecha"]],
      body: filtered.map(row => [
        row._id?.toString().slice(-6), row.cooler_id, row.door_opens, row.open_time, row.compressor, row.power, row.on_time, row.min_voltage, row.max_voltage, row.temperature, row.calday
      ])
    })
    doc.save("coolers.pdf")
    setEventLog(log => [...log, {type: "export", message: "Exportación a PDF", date: new Date().toISOString()}])
  }

  // --- NUEVO: Log persistente en localStorage ---
  useEffect(() => {
    const stored = localStorage.getItem("eventLog")
    if (stored) setEventLog(JSON.parse(stored))
  }, [])
  useEffect(() => {
    localStorage.setItem("eventLog", JSON.stringify(eventLog))
  }, [eventLog])

  // --- NUEVO: Log de filtros y comparaciones ---
  useEffect(() => {
    setEventLog(log => [...log, {type: "filtro", message: `Filtro aplicado: fecha ${dateRange.from || '-'} a ${dateRange.to || '-'}, coolers: ${selectedCoolers.join(',') || 'todos'}`, date: new Date().toISOString()}])
    // eslint-disable-next-line
  }, [dateRange.from, dateRange.to, selectedCoolers.join(",")])

  // --- NUEVO: Gráficas interactivas con zoom/pan y comparación de coolers ---
  // Agrupar datos por cooler para comparación
  const coolersToCompare = selectedCoolers.length > 0 ? selectedCoolers : [...new Set(coolers.map(c => c.cooler_id))].slice(0, 3)
  const dataByCooler: Record<string, CoolerData[]> = useMemo(() => {
    const grouped: Record<string, CoolerData[]> = {}
    coolers.forEach(c => {
      if (!grouped[c.cooler_id]) grouped[c.cooler_id] = []
      grouped[c.cooler_id].push(c)
    })
    return grouped
  }, [coolers])

  // Botón para borrar historial de eventos
  function clearEventLog() {
    setEventLog([])
    localStorage.removeItem("eventLog")
  }

  useEffect(() => {
    setEventLog([])
    localStorage.removeItem("eventLog")
  }, [])

  // Render principal del dashboard
  return (
    <main className="min-h-screen bg-[hsl(var(--arca-light))] p-4 md:p-8">
      <Toaster />
      {/* Header con título y badge de registros */}
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-lg shadow p-4 border border-[hsl(var(--arca-card-border))]">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          {/* Logo oculto para look profesional sin branding */}
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 text-[hsl(var(--arca-red))]">Predicción Smart Cooler</h1>
            <p className="text-gray-600 text-base sm:text-lg">Resultados de las predicciones para los refrigeradores</p>
          </div>
        </div>
        <Badge variant="secondary">Total registros: {filtered.length}</Badge>
      </header>
      {/* Filtros principales mejor acomodados */}
      <div className="w-full flex flex-col md:flex-row md:items-end gap-2 mb-4">
        <div className="flex-1 flex flex-col md:flex-row gap-2">
          <Input
            placeholder="Buscar por ID o fecha..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="max-w-full sm:max-w-xs"
          />
          <Input
            placeholder="Filtrar temperatura..."
            value={filterTemp}
            onChange={e => { setFilterTemp(e.target.value); setPage(1) }}
            className="max-w-full sm:max-w-xs"
          />
          <div className="flex flex-col">
            <label className="text-xs font-semibold">Fecha</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={e => setDateRange(r => ({...r, from: e.target.value, to: e.target.value}))}
              className="border rounded px-2 py-1 text-xs"
            />
          </div>
        </div>
        <div className="flex flex-row gap-2 ml-0 md:ml-4">
          <Button onClick={exportToCSV} size="sm" variant="outline">CSV</Button>
          <Button onClick={exportToExcel} size="sm" variant="outline">Excel</Button>
          <Button onClick={exportToPDF} size="sm" variant="outline">PDF</Button>
        </div>
      </div>
      {/* Métricas rápidas */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="border border-[hsl(var(--arca-card-border))] bg-white shadow-md">
          <CardHeader><CardTitle className="text-[hsl(var(--arca-red))]">Coolers</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-[hsl(var(--arca-red))]">{totalCoolers}</CardContent>
        </Card>
        <Card className="border border-[hsl(var(--arca-card-border))] bg-white shadow-md">
          <CardHeader><CardTitle className="text-green-700">Puertas abiertas</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-green-700 flex items-center gap-2">
            {totalDoorOpens}
            <span className={trendDoorOpens > 0 ? "text-red-500" : trendDoorOpens < 0 ? "text-green-500" : "text-gray-400"}>
              {trendDoorOpens > 0 ? '▲' : trendDoorOpens < 0 ? '▼' : '–'}
              {Math.abs(trendDoorOpens)}
            </span>
          </CardContent>
        </Card>
        <Card className="border border-[hsl(var(--arca-card-border))] bg-white shadow-md">
          <CardHeader><CardTitle className="text-orange-600">Temp. Promedio</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-orange-600 flex items-center gap-2">
            {avgTemp}°C
            <span className={trendTemp > 0 ? "text-red-500" : trendTemp < 0 ? "text-green-500" : "text-gray-400"}>
              {trendTemp > 0 ? '▲' : trendTemp < 0 ? '▼' : '–'}
              {Math.abs(trendTemp)}
            </span>
          </CardContent>
        </Card>
        <Card className="border border-[hsl(var(--arca-card-border))] bg-white shadow-md">
          <CardHeader><CardTitle className="text-purple-700">Potencia Promedio</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-purple-700 flex items-center gap-2">
            {avgPower} W
            <span className={trendPower > 0 ? "text-red-500" : trendPower < 0 ? "text-green-500" : "text-gray-400"}>
              {trendPower > 0 ? '▲' : trendPower < 0 ? '▼' : '–'}
              {Math.abs(trendPower)}
            </span>
          </CardContent>
        </Card>
      </section>
      {/* Tabs para tabla y gráficas */}
      <Tabs defaultValue="tabla" className="w-full">
        <TabsList className="mb-4 bg-[hsl(var(--arca-light))] border border-[hsl(var(--arca-card-border))]">
          <TabsTrigger value="tabla">Tabla</TabsTrigger>
          <TabsTrigger value="graficas">Gráficas</TabsTrigger>
        </TabsList>
        {/* Tabla de datos */}
        <TabsContent value="tabla">
          {loading ? (
            <div className="bg-white rounded-lg shadow p-2 md:p-6 border border-[hsl(var(--arca-card-border))]">
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-8 w-full mb-2" />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-2 md:p-6 overflow-x-auto border border-[hsl(var(--arca-card-border))]">
              <Table className="text-xs sm:text-sm" ref={tableRef}>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => handleSort("_id")} className="cursor-pointer">ID {sortBy==="_id" ? (sortDir==="asc"?"▲":"▼") : null}</TableHead>
                    <TableHead onClick={() => handleSort("cooler_id")} className="cursor-pointer">Cooler {sortBy==="cooler_id" ? (sortDir==="asc"?"▲":"▼") : null}</TableHead>
                    <TableHead onClick={() => handleSort("door_opens")} className="cursor-pointer">Puertas {sortBy==="door_opens" ? (sortDir==="asc"?"▲":"▼") : null}</TableHead>
                    <TableHead onClick={() => handleSort("open_time")} className="cursor-pointer">Tiempo Abierto {sortBy==="open_time" ? (sortDir==="asc"?"▲":"▼") : null}</TableHead>
                    <TableHead onClick={() => handleSort("compressor")} className="cursor-pointer">Compresor {sortBy==="compressor" ? (sortDir==="asc"?"▲":"▼") : null}</TableHead>
                    <TableHead onClick={() => handleSort("power")} className="cursor-pointer">Potencia {sortBy==="power" ? (sortDir==="asc"?"▲":"▼") : null}</TableHead>
                    <TableHead onClick={() => handleSort("on_time")} className="cursor-pointer">On Time {sortBy==="on_time" ? (sortDir==="asc"?"▲":"▼") : null}</TableHead>
                    <TableHead onClick={() => handleSort("min_voltage")} className="cursor-pointer">Min Volt {sortBy==="min_voltage" ? (sortDir==="asc"?"▲":"▼") : null}</TableHead>
                    <TableHead onClick={() => handleSort("max_voltage")} className="cursor-pointer">Max Volt {sortBy==="max_voltage" ? (sortDir==="asc"?"▲":"▼") : null}</TableHead>
                    <TableHead onClick={() => handleSort("temperature")} className="cursor-pointer">Temp {sortBy==="temperature" ? (sortDir==="asc"?"▲":"▼") : null}</TableHead>
                    <TableHead onClick={() => handleSort("calday")} className="cursor-pointer">Fecha {sortBy==="calday" ? (sortDir==="asc"?"▲":"▼") : null}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length > 0 ? paginated.map((row, i) => (
                    <TableRow key={row._id || i} onClick={() => setSelectedCooler(row)} className={
                      `cursor-pointer hover:bg-gray-100 text-xs sm:text-sm ${row.temperature > 10 || row.temperature < 0 ? 'bg-red-100' : ''}`
                    }>
                      <TableCell>{row._id?.toString().slice(-6)}</TableCell>
                      <TableCell>{row.cooler_id}</TableCell>
                      <TableCell>{row.door_opens}</TableCell>
                      <TableCell>{row.open_time}</TableCell>
                      <TableCell>{row.compressor}</TableCell>
                      <TableCell>{row.power}</TableCell>
                      <TableCell>{row.on_time}</TableCell>
                      <TableCell>{row.min_voltage}</TableCell>
                      <TableCell>{row.max_voltage}</TableCell>
                      <TableCell>{row.temperature}°C {row.temperature > 10 || row.temperature < 0 ? <span title="Alerta" className="text-red-500 font-bold">!</span> : null}</TableCell>
                      <TableCell>{row.calday}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={11} className="text-center py-4">Sin datos</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-end mt-4">
                <CustomPagination
                  page={page}
                  pageSize={rowsPerPage}
                  total={filtered.length}
                  onPageChange={setPage}
                />
              </div>
            </div>
          )}
          {/* Drawer de detalles del cooler */}
          <Drawer open={!!selectedCooler} onOpenChange={open => !open && setSelectedCooler(null)}>
            <DrawerContent className="flex justify-center items-center min-h-screen p-0 bg-transparent">
              {selectedCooler && (
                <div className="relative p-4 w-full max-w-md mx-auto bg-white shadow-md">
                  <DrawerClose onClick={() => setSelectedCooler(null)} className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-700 focus:outline-none">
                    <X className="w-5 h-5" />
                  </DrawerClose>
                  <h2 className="text-xl font-bold mb-2">Detalles del Cooler</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div><b>ID:</b> {selectedCooler._id}</div>
                    <div><b>Cooler:</b> {selectedCooler.cooler_id}</div>
                    <div><b>Puertas abiertas:</b> {selectedCooler.door_opens}</div>
                    <div><b>Tiempo abierto:</b> {selectedCooler.open_time}</div>
                    <div><b>Compresor:</b> {selectedCooler.compressor}</div>
                    <div><b>Potencia:</b> {selectedCooler.power}</div>
                    <div><b>On Time:</b> {selectedCooler.on_time}</div>
                    <div><b>Min Volt:</b> {selectedCooler.min_voltage}</div>
                    <div><b>Max Volt:</b> {selectedCooler.max_voltage}</div>
                    <div><b>Temperatura:</b> {selectedCooler.temperature}°C</div>
                    <div><b>Fecha:</b> {selectedCooler.calday}</div>
                  </div>
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Historial de Temperatura</h3>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={coolers.filter(c => c.cooler_id === selectedCooler.cooler_id)}>
                        <XAxis dataKey="calday" hide />
                        <YAxis hide />
                        <Tooltip />
                        <Line type="monotone" dataKey="temperature" stroke="#f59e42" name="Temp (°C)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </DrawerContent>
          </Drawer>
        </TabsContent>
        {/* Gráficas interactivas */}
        <TabsContent value="graficas">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Comparar Coolers (Temp.) <span title="Comparación de temperatura por cooler" className="ml-1 text-gray-400 cursor-help">?</span></CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="calday" type="category" allowDuplicatedCategory={false} tick={{ fontSize: 12 }}/>
                    <YAxis tick={{ fontSize: 12 }}/>
                    <Tooltip />
                    <Legend />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Brush dataKey="calday" height={20} stroke="#8884d8" />
                    {/* Muestra hasta 3 coolers para comparación */}
                    {[...new Set(coolers.map(c => c.cooler_id))].slice(0, 3).map((id, idx) => (
                      <Line
                        key={id}
                        data={coolers.filter(c => c.cooler_id === id)}
                        type="monotone"
                        dataKey="temperature"
                        name={id}
                        stroke={["#f59e42","#7c3aed","#22c55e","#f43f5e","#0ea5e9"][idx%5]}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Comparar Coolers (Potencia)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="calday" type="category" allowDuplicatedCategory={false} tick={{ fontSize: 12 }}/>
                    <YAxis tick={{ fontSize: 12 }}/>
                    <Tooltip />
                    <Legend />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Brush dataKey="calday" height={20} stroke="#8884d8" />
                    {[...new Set(coolers.map(c => c.cooler_id))].slice(0, 3).map((id, idx) => (
                      <Line
                        key={id}
                        data={coolers.filter(c => c.cooler_id === id)}
                        type="monotone"
                        dataKey="power"
                        name={id}
                        stroke={["#f59e42","#7c3aed","#22c55e","#f43f5e","#0ea5e9"][idx%5]}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Puertas Abiertas por Día <span title="Total de puertas abiertas por día" className="ml-1 text-gray-400 cursor-help">?</span></CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={coolers} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="calday" tick={{ fontSize: 12 }}/>
                    <YAxis tick={{ fontSize: 12 }}/>
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="door_opens" stroke="#22c55e" name="Puertas" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Voltajes Mín/Max <span title="Voltajes mínimos y máximos registrados por día" className="ml-1 text-gray-400 cursor-help">?</span></CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={coolers} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="calday" tick={{ fontSize: 12 }}/>
                    <YAxis tick={{ fontSize: 12 }}/>
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="min_voltage" stroke="#0ea5e9" name="Min Volt" />
                    <Line type="monotone" dataKey="max_voltage" stroke="#f43f5e" name="Max Volt" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Coolers por Rango de Temperatura</CardTitle></CardHeader>
              <CardContent>
                <PieChartCoolers
                  data={[
                    { name: 'Bajo 0°C', value: coolers.filter(c => c.temperature < 0).length },
                    { name: '0-5°C', value: coolers.filter(c => c.temperature >= 0 && c.temperature < 5).length },
                    { name: '5-10°C', value: coolers.filter(c => c.temperature >= 5 && c.temperature <= 10).length },
                    { name: 'Arriba 10°C', value: coolers.filter(c => c.temperature > 10).length },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  colors={["#0ea5e9", "#f59e42", "#22c55e", "#f43f5e"]}
                  title="Distribución de Temperatura"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Coolers por Rango de Potencia</CardTitle></CardHeader>
              <CardContent>
                <PieChartCoolers
                  data={[
                    { name: 'Bajo 50W', value: coolers.filter(c => c.power < 50).length },
                    { name: '50-100W', value: coolers.filter(c => c.power >= 50 && c.power < 100).length },
                    { name: '100-200W', value: coolers.filter(c => c.power >= 100 && c.power < 200).length },
                    { name: '200W+', value: coolers.filter(c => c.power >= 200).length },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  colors={["#7c3aed", "#f59e42", "#22c55e", "#f43f5e"]}
                  title="Distribución de Potencia"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}