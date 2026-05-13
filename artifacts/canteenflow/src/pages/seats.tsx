import { useState, Suspense, Component, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { useListSeats, useGetSeatOccupancy, useGetMyReservation, useGetCrowdPrediction, getListSeatsQueryKey, getGetMyReservationQueryKey, getGetSeatOccupancyQueryKey } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Users, Clock, Loader2, CheckCircle, Zap, MapPin, Grid3x3, Box } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Box as ThreeBox, Plane } from "@react-three/drei";

class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function SeatGrid({ seats, selectedIds }: { seats: any[]; selectedIds: number[] }) {
  const tableGroups = new Map<string, any[]>();
  for (const seat of seats) {
    if (!tableGroups.has(seat.tableNumber)) tableGroups.set(seat.tableNumber, []);
    tableGroups.get(seat.tableNumber)!.push(seat);
  }

  return (
    <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto h-full">
      {[...tableGroups.entries()].map(([tableNum, tableSeats]) => (
        <div key={tableNum} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <div className="font-bold text-sm mb-3 text-center">Table {tableNum}</div>
          <div className="grid grid-cols-2 gap-2">
            {tableSeats.map((seat: any) => {
              const isSelected = selectedIds.includes(seat.id);
              const color = isSelected
                ? "bg-primary text-white"
                : seat.status === "available"
                ? "bg-green-400 text-white"
                : seat.status === "reserved"
                ? "bg-amber-400 text-white"
                : "bg-red-400 text-white";
              return (
                <div key={seat.id} className={`rounded-xl p-2 text-center text-xs font-semibold transition-all ${color}`} title={`${seat.seatNumber} - ${seat.status}`}>
                  {seat.seatNumber}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Seat3D({ seat, isSelected }: { seat: any; isSelected: boolean }) {
  const [hovered, setHovered] = useState(false);
  const status = seat.status;
  const color = isSelected ? "#FF6B35"
    : status === "available" ? (hovered ? "#22c55e" : "#4ade80")
    : status === "reserved" ? "#f59e0b"
    : "#ef4444";

  return (
    <group position={[seat.col * 2.2, 0, seat.row * 3]} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
      <ThreeBox args={[1.2, 0.15, 1.2]} position={[0, 0.45, 0]}>
        <meshStandardMaterial color={color} />
      </ThreeBox>
      <ThreeBox args={[1.2, 1, 0.12]} position={[0, 0.95, -0.54]}>
        <meshStandardMaterial color={isSelected ? "#c2440a" : "#16a34a"} />
      </ThreeBox>
      <Text position={[0, 1.6, 0]} fontSize={0.25} color="white" anchorX="center" anchorY="middle">
        {seat.seatNumber}
      </Text>
    </group>
  );
}

function ThreeDCanvas({ seats, selectedIds }: { seats: any[]; selectedIds: number[] }) {
  const tableGroups = new Map<string, any[]>();
  for (const seat of seats) {
    if (!tableGroups.has(seat.tableNumber)) tableGroups.set(seat.tableNumber, []);
    tableGroups.get(seat.tableNumber)!.push(seat);
  }

  return (
    <Canvas camera={{ position: [8, 12, 16], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 5]} intensity={1} />
      <Plane args={[60, 60]} rotation={[-Math.PI / 2, 0, 0]} position={[8, -0.01, 8]}>
        <meshStandardMaterial color="#f5f0eb" />
      </Plane>
      {[...tableGroups.entries()].map(([tableNum, tableSeats], ti) => {
        const col = ti % 4;
        const row = Math.floor(ti / 4);
        return (
          <group key={tableNum} position={[col * 10, 0, row * 10]}>
            {tableSeats.map((seat: any, si: number) => (
              <Seat3D
                key={seat.id}
                seat={{ ...seat, col: (si % 2) + 1, row: Math.floor(si / 2) + 1 }}
                isSelected={selectedIds.includes(seat.id)}
              />
            ))}
          </group>
        );
      })}
      <OrbitControls minDistance={5} maxDistance={40} maxPolarAngle={Math.PI / 2} />
    </Canvas>
  );
}

export default function SeatsPage() {
  const { isSignedIn, getToken } = useAuth();
  const [groupSize, setGroupSize] = useState(1);
  const [reserving, setReserving] = useState(false);
  const [cancellingRes, setCancellingRes] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const qc = useQueryClient();

  const { data: seats = [], isLoading: seatsLoading } = useListSeats({});
  const { data: occupancy } = useGetSeatOccupancy({});
  const { data: myReservation } = useGetMyReservation({});
  const { data: crowdData } = useGetCrowdPrediction({ query: { enabled: true } } as any);

  const occ = occupancy as any;
  const myRes = myReservation as any;
  const reservedIds = myRes ? (myRes.seatIds as number[]) : [];

  async function reserveSeats() {
    if (!isSignedIn) return;
    setReserving(true);
    try {
      const token = await getToken();
      await apiFetch("/seats/reserve", { method: "POST", body: JSON.stringify({ groupSize }) }, token);
      await qc.invalidateQueries({ queryKey: getListSeatsQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetMyReservationQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetSeatOccupancyQueryKey() });
    } catch (e: any) {
      alert(e.message || "Failed to reserve seats");
    } finally {
      setReserving(false);
    }
  }

  async function cancelReservation() {
    if (!isSignedIn) return;
    setCancellingRes(true);
    try {
      const token = await getToken();
      await apiFetch("/seats/my-reservation", { method: "DELETE" }, token);
      await qc.invalidateQueries({ queryKey: getListSeatsQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetMyReservationQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetSeatOccupancyQueryKey() });
    } catch (e: any) {
      alert(e.message || "Failed to cancel reservation");
    } finally {
      setCancellingRes(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/menu" className="font-bold text-sm text-muted-foreground hover:text-foreground">← Menu</Link>
          <span className="text-border">|</span>
          <h1 className="font-black text-lg flex-1">Seat Reservation</h1>
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            <button onClick={() => setViewMode("2d")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "2d" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              <Grid3x3 className="w-3 h-3" /> Map
            </button>
            <button onClick={() => setViewMode("3d")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "3d" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              <Box className="w-3 h-3" /> 3D
            </button>
          </div>
          {occ && (
            <div className="hidden md:flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{occ.available} free</span>
              <span className="flex items-center gap-1 text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />{occ.reserved} reserved</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 max-w-7xl mx-auto w-full px-4 py-4 gap-4">
        <div className="flex-1 rounded-2xl overflow-hidden border border-border bg-stone-50 min-h-[400px] relative">
          {seatsLoading ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : viewMode === "3d" ? (
            <WebGLErrorBoundary
              fallback={
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 text-muted-foreground">
                  <Box className="w-10 h-10 opacity-30" />
                  <p className="text-sm font-medium">3D view requires WebGL support</p>
                  <button onClick={() => setViewMode("2d")} className="text-primary text-sm underline">Switch to map view</button>
                </div>
              }
            >
              <Suspense fallback={<div className="flex items-center justify-center h-full min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
                <ThreeDCanvas seats={seats as any[]} selectedIds={reservedIds} />
              </Suspense>
            </WebGLErrorBoundary>
          ) : (
            <SeatGrid seats={seats as any[]} selectedIds={reservedIds} />
          )}

          <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap">
            {[
              { color: "bg-green-400", label: "Available" },
              { color: "bg-amber-400", label: "Reserved" },
              { color: "bg-red-400", label: "Occupied" },
              { color: "bg-primary", label: "Your seats" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 bg-white/90 backdrop-blur px-2 py-1 rounded-full shadow text-xs">
                <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-80 space-y-4 flex-shrink-0">
          {occ && (
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <h3 className="font-bold mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Canteen Status</h3>
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Occupancy</span>
                  <span className="font-semibold">{Math.round(occ.occupancyPercent)}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full gradient-orange transition-all duration-500" style={{ width: `${Math.min(occ.occupancyPercent, 100)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-green-50 rounded-xl p-2"><div className="font-bold text-green-700">{occ.available}</div><div className="text-xs text-green-600">Free</div></div>
                <div className="bg-amber-50 rounded-xl p-2"><div className="font-bold text-amber-700">{occ.reserved}</div><div className="text-xs text-amber-600">Reserved</div></div>
                <div className="bg-red-50 rounded-xl p-2"><div className="font-bold text-red-700">{occ.occupied}</div><div className="text-xs text-red-600">Taken</div></div>
              </div>
            </div>
          )}

          {(crowdData as any)?.recommendation && (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-4">
              <h3 className="font-bold mb-2 flex items-center gap-2 text-blue-800"><Zap className="w-4 h-4" /> AI Insight</h3>
              <p className="text-sm text-blue-700">{(crowdData as any).recommendation}</p>
            </div>
          )}

          {isSignedIn ? (
            myRes ? (
              <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <h3 className="font-bold">Reservation Active</h3>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-muted-foreground">Table</span><span className="font-semibold">{myRes.tableNumber}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Seats</span><span className="font-semibold">{(myRes.seatNumbers as string[]).join(", ")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Group size</span><span className="font-semibold">{myRes.groupSize}</span></div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span className="font-semibold flex items-center gap-1 text-amber-600">
                      <Clock className="w-3 h-3" />
                      {new Date(myRes.expiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
                <Button onClick={cancelReservation} disabled={cancellingRes} variant="destructive" className="w-full">
                  {cancellingRes ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel Reservation"}
                </Button>
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Reserve Seats</h3>
                <div className="mb-4">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Group size</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        onClick={() => setGroupSize(n)}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${groupSize === n ? "gradient-orange text-white border-0" : "border-border hover:bg-muted"}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  AI finds the best available table for your group. Reservation holds for 20 minutes.
                </p>
                <Button onClick={reserveSeats} disabled={reserving} className="w-full gradient-orange text-white border-0">
                  {reserving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Finding seats...</> : `Reserve ${groupSize} Seat${groupSize > 1 ? "s" : ""}`}
                </Button>
              </div>
            )
          ) : (
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm text-center">
              <div className="text-3xl mb-2">🔐</div>
              <p className="text-muted-foreground text-sm mb-3">Sign in to reserve seats</p>
              <Link href="/"><Button size="sm" className="gradient-orange text-white border-0">Sign In</Button></Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
