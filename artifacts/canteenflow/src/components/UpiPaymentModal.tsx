import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, X, Smartphone, QrCode, Copy, Check, BadgeCheck, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

const UPI_ID = "canteenflow@upi";
const QR_PLACEHOLDER = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' fill='%23fff'/><rect x='20' y='20' width='60' height='60' rx='4' fill='%23333'/><rect x='30' y='30' width='40' height='40' rx='2' fill='%23fff'/><rect x='38' y='38' width='24' height='24' fill='%23333'/><rect x='120' y='20' width='60' height='60' rx='4' fill='%23333'/><rect x='130' y='30' width='40' height='40' rx='2' fill='%23fff'/><rect x='138' y='38' width='24' height='24' fill='%23333'/><rect x='20' y='120' width='60' height='60' rx='4' fill='%23333'/><rect x='30' y='130' width='40' height='40' rx='2' fill='%23fff'/><rect x='38' y='138' width='24' height='24' fill='%23333'/><rect x='90' y='90' width='20' height='20' fill='%23333'/><rect x='115' y='90' width='15' height='10' fill='%23333'/><rect x='135' y='90' width='10' height='15' fill='%23333'/><rect x='90' y='115' width='10' height='15' fill='%23333'/><rect x='105' y='120' width='20' height='10' fill='%23333'/><rect x='130' y='115' width='15' height='20' fill='%23333'/><rect x='150' y='115' width='10' height='10' fill='%23333'/><rect x='90' y='135' width='15' height='15' fill='%23333'/><rect x='110' y='140' width='20' height='10' fill='%23333'/><rect x='135' y='140' width='15' height='20' fill='%23333'/><rect x='155' y='145' width='10' height='15' fill='%23333'/><text x='100' y='195' font-family='monospace' font-size='8' text-anchor='middle' fill='%23666'>CanteenFlow UPI</text></svg>`;

type PaymentMethod = "upi" | "cod";
type PayStep = "scan" | "processing" | "success";

interface UpiPaymentModalProps {
  open: boolean;
  amount: number;
  onSuccess: (method: PaymentMethod) => void;
  onClose: () => void;
  isGuest?: boolean;
}

export function UpiPaymentModal({ open, amount, onSuccess, onClose, isGuest }: UpiPaymentModalProps) {
  const [step, setStep] = useState<PayStep>("scan");
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [upiInput, setUpiInput] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("scan");
      setCountdown(3);
    }
  }, [open]);

  useEffect(() => {
    if (step !== "processing") return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setStep("success");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (step !== "success") return;
    const t = setTimeout(() => onSuccess(method), 1200);
    return () => clearTimeout(t);
  }, [step, method, onSuccess]);

  function copyUpiId() {
    navigator.clipboard.writeText(UPI_ID).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleVerify() {
    setStep("processing");
    setCountdown(3);
  }

  function handleCod() {
    onSuccess("cod");
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={step === "scan" ? onClose : undefined}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl max-w-md mx-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl overflow-hidden"
          >
            {step === "scan" && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-black text-xl">Pay ₹{amount}</h2>
                    <p className="text-muted-foreground text-sm">{isGuest ? "Demo payment — no real charges" : "Choose payment option"}</p>
                  </div>
                  <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {isGuest && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
                    <span className="text-base">🎭</span> Demo mode — this simulates a payment flow
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => setMethod("upi")}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all border ${method === "upi" ? "gradient-orange text-white border-0" : "border-border"}`}
                  >
                    <Smartphone className="w-4 h-4" /> Online
                  </button>
                  <button
                    onClick={() => setMethod("cod")}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all border ${method === "cod" ? "gradient-orange text-white border-0" : "border-border"}`}
                  >
                    <CreditCard className="w-4 h-4" /> COD
                  </button>
                </div>

                {method === "upi" ? (
                  <>
                    <div className="flex items-center gap-2 mb-4 bg-muted rounded-xl p-1">
                      <button
                        onClick={() => setMethod("upi")}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-white shadow-sm"
                      >
                        <QrCode className="w-4 h-4" /> UPI Pay
                      </button>
                      <button
                        onClick={() => setMethod("cod")}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-muted-foreground"
                      >
                        <BadgeCheck className="w-4 h-4" /> Cash
                      </button>
                    </div>

                    <div className="flex flex-col items-center gap-4 py-2">
                      <div className="w-48 h-48 rounded-2xl border-2 border-border p-2 bg-white shadow-sm">
                        <img src={QR_PLACEHOLDER} alt="UPI QR Code" className="w-full h-full" />
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-1">Scan with any UPI app</div>
                        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                          <span className="font-mono text-sm font-semibold">{UPI_ID}</span>
                          <button onClick={copyUpiId} className="text-primary hover:opacity-70 transition-opacity">
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 py-2">
                    <div className="p-3 rounded-xl bg-muted text-sm text-muted-foreground">
                      Pay on delivery / pickup. No online charge is taken.
                    </div>
                  </div>
                )}

                {method === "upi" ? (
                  <Button onClick={handleVerify} className="w-full mt-5 h-12 gradient-orange text-white border-0 text-base font-semibold rounded-xl">
                    I've Paid — Verify
                  </Button>
                ) : (
                  <Button onClick={handleCod} className="w-full mt-5 h-12 gradient-orange text-white border-0 text-base font-semibold rounded-xl">
                    Confirm COD Order
                  </Button>
                )}
                <p className="text-center text-xs text-muted-foreground mt-3">Secured · End-to-end encrypted · 256-bit SSL</p>
              </div>
            )}

            {step === "processing" && (
              <div className="p-8 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full gradient-orange flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <div className="text-center">
                  <h2 className="font-black text-xl mb-1">Verifying Payment</h2>
                  <p className="text-muted-foreground text-sm">Confirming with your bank...</p>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-orange-200 flex items-center justify-center">
                  <span className="font-black text-2xl text-orange-500">{countdown}</span>
                </div>
              </div>
            )}

            {step === "success" && (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-8 flex flex-col items-center gap-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10, stiffness: 200 }} className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </motion.div>
                <div className="text-center">
                  <h2 className="font-black text-xl mb-1 text-green-600">Payment Successful!</h2>
                  <p className="text-muted-foreground text-sm">₹{amount} paid · Order confirmed</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
