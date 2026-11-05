import { NEIGHBOR_DISTANCE } from './constants';

export interface TableDef {
  id: string;
  x: number;
  z: number;
}

export interface SeatDef {
  id: string;
  x: number;
  z: number;
  /** Góc quay quanh trục Y để ghế (mặt trước là +z cục bộ) hướng về phía bàn hoặc phố. */
  rotY: number;
  /** null nếu là ghế dọc vỉa hè, không thuộc bàn nào. */
  tableId: string | null;
}

/** Ba bàn thấp trên vỉa hè (đơn vị mét, mặt phẳng x/z, vỉa hè nằm ở z từ -6 đến 4). */
export const TABLES: readonly TableDef[] = [
  { id: 't1', x: -5, z: -1.5 },
  { id: 't2', x: 0, z: -2 },
  { id: 't3', x: 5, z: -1.5 },
];

const TABLE_SEAT_RADIUS = 1.15;
const r3 = (n: number): number => Math.round(n * 1000) / 1000;

function seatsAroundTable(table: TableDef, firstIndex: number): SeatDef[] {
  return [45, 135, 225, 315].map((deg, i) => {
    const a = (deg * Math.PI) / 180;
    const x = table.x + Math.cos(a) * TABLE_SEAT_RADIUS;
    const z = table.z + Math.sin(a) * TABLE_SEAT_RADIUS;
    return {
      id: `s${String(firstIndex + i).padStart(2, '0')}`,
      x: r3(x),
      z: r3(z),
      rotY: r3(Math.atan2(table.x - x, table.z - z)),
      tableId: table.id,
    };
  });
}

/** 14 chỗ ngồi: 12 chỗ quanh 3 bàn + 2 chỗ dọc mép vỉa hè nhìn ra đường. */
export const SEATS: readonly SeatDef[] = [
  ...TABLES.flatMap((t, i) => seatsAroundTable(t, i * 4 + 1)),
  { id: 's13', x: -2.6, z: 3.0, rotY: 0, tableId: null },
  { id: 's14', x: 3, z: 3.0, rotY: 0, tableId: null },
];

export const SEAT_IDS: ReadonlySet<string> = new Set(SEATS.map((s) => s.id));

/** Hai ghế "ngồi cạnh" nhau nếu khác nhau và cách ≤ NEIGHBOR_DISTANCE mét. Dùng cho đãi trà. */
export function areNeighbors(a: string, b: string): boolean {
  if (a === b) return false;
  const sa = SEATS.find((s) => s.id === a);
  const sb = SEATS.find((s) => s.id === b);
  if (!sa || !sb) return false;
  return Math.hypot(sa.x - sb.x, sa.z - sb.z) <= NEIGHBOR_DISTANCE;
}
