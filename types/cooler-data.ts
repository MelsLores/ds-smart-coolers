// Tipos de datos para coolers
export interface CoolerData {
  cooler_id: string;
  door_opens: number;
  open_time: number;
  compressor: number;
  power: number;
  on_time: number;
  min_voltage: number;
  max_voltage: number;
  temperature: number;
  calday: string;
}
