// Página 404: ruta no encontrada
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-yellow-50">
      <h1 className="text-3xl font-bold text-yellow-600 mb-4">Página no encontrada</h1>
      <p className="text-lg text-gray-700 mb-2">La ruta que buscas no existe.</p>
      <a href="/" className="text-blue-600 underline">Volver al dashboard</a>
    </div>
  )
}
