import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  FileJson,
  Laptop,
  QrCode,
  RefreshCw,
  Smartphone,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";

interface PlanTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanTransferModal({ open, onOpenChange }: PlanTransferModalProps) {
  const { state, restoreBackup } = useStore();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [syncUrl, setSyncUrl] = useState<string>("");
  const [rawSyncCode, setRawSyncCode] = useState<string>("");
  const [importCodeInput, setImportCodeInput] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Generate payload
  useEffect(() => {
    if (!open) return;

    try {
      // Create minimal transfer payload
      const payload = {
        version: "1.0",
        transferredAt: new Date().toISOString(),
        business: state.business,
        ownership: state.ownership,
        tasks: state.tasks,
        maintenance: state.maintenance,
        drafts: state.drafts,
        savedDomainIdeas: state.savedDomainIdeas,
        dnsPlanning: state.dnsPlanning,
        onboardingComplete: state.onboardingComplete,
      };

      const jsonString = JSON.stringify(payload);
      // Encode as safe base64
      const encoded = btoa(encodeURIComponent(jsonString));
      setRawSyncCode(encoded);

      // Build transfer link
      const url = `${window.location.origin}/dashboard?import_plan=${encodeURIComponent(encoded)}`;
      setSyncUrl(url);

      // Generate QR code for mobile scanning
      QRCode.toDataURL(url, {
        width: 240,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      })
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch((err) => console.error("QR Code error:", err));
    } catch (err) {
      console.error("Failed to generate transfer payload:", err);
    }
  }, [open, state]);

  const copyTransferLink = async () => {
    try {
      await navigator.clipboard.writeText(syncUrl);
      setCopied(true);
      toast.success("Transfer link copied! Open on your phone or laptop to sync.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const copyBackupCode = async () => {
    try {
      await navigator.clipboard.writeText(rawSyncCode);
      toast.success("Backup code copied to clipboard!");
    } catch {
      toast.error("Could not copy code.");
    }
  };

  const downloadJsonBackup = () => {
    const filename = `cornerstone-plan-${(state.business.name || "business").toLowerCase().replace(/[^a-z0-9]/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded plan backup file!");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const ok = restoreBackup(parsed);
        if (ok) {
          toast.success("Plan successfully imported from backup file!");
          onOpenChange(false);
        } else {
          toast.error("Invalid plan backup file format.");
        }
      } catch {
        toast.error("Could not parse JSON backup file.");
      }
    };
    reader.readAsText(file);
  };

  const handleImportCode = () => {
    const trimmed = importCodeInput.trim();
    if (!trimmed) {
      toast.error("Please paste a sync code or URL.");
      return;
    }

    try {
      let codeToDecode = trimmed;
      if (trimmed.includes("import_plan=")) {
        const urlObj = new URL(trimmed);
        codeToDecode = urlObj.searchParams.get("import_plan") || "";
      }

      const decoded = decodeURIComponent(atob(codeToDecode));
      const parsed = JSON.parse(decoded);
      const ok = restoreBackup(parsed);
      if (ok) {
        toast.success("Plan successfully restored and synchronized!");
        onOpenChange(false);
      } else {
        toast.error("Could not restore plan from this sync code.");
      }
    } catch (err) {
      toast.error("Invalid sync code or corrupted data.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              <Smartphone className="size-3 mr-1" /> No-Login Sync
            </Badge>
            <span className="text-xs text-muted-foreground">Cross-Device Transfer Engine</span>
          </div>
          <DialogTitle className="font-display text-xl font-bold">
            Transfer or Sync Plan Across Devices
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Move your full launch progress, customized tasks, DNS notes, and domain records between
            your laptop and smartphone without needing an account or cloud login.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="qr" className="space-y-4 pt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr" className="text-xs gap-1.5">
              <QrCode className="size-3.5" /> Transfer to Phone / Device
            </TabsTrigger>
            <TabsTrigger value="import" className="text-xs gap-1.5">
              <Upload className="size-3.5" /> Import or Restore
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Transfer Out via QR & Link */}
          <TabsContent value="qr" className="space-y-4">
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/80 bg-card text-center space-y-3">
              {qrDataUrl ? (
                <div className="p-2 bg-white rounded-xl shadow-md border border-slate-200">
                  <img
                    src={qrDataUrl}
                    alt="Scan to transfer plan"
                    className="size-48 object-contain"
                  />
                </div>
              ) : (
                <div className="size-48 flex items-center justify-center bg-muted rounded-xl">
                  <RefreshCw className="size-6 animate-spin text-muted-foreground" />
                </div>
              )}

              <div className="space-y-1 max-w-sm">
                <span className="text-xs font-semibold text-foreground flex items-center justify-center gap-1.5">
                  <Smartphone className="size-4 text-primary" /> Scan with your mobile camera
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Opens Cornerstone on your mobile browser and instantly imports your business plan,
                  checklist, and DNS configurations.
                </p>
              </div>
            </div>

            {/* Transfer Link Bar */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Or share via direct sync link:</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={syncUrl} className="font-mono text-[11px] bg-muted/40 h-9" />
                <Button
                  onClick={copyTransferLink}
                  size="sm"
                  className="shrink-0 gap-1.5 font-semibold text-xs"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
              </div>
            </div>

            {/* File Backup Option */}
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileJson className="size-4 text-primary" /> Export Standalone JSON File
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Download a timestamped snapshot of your plan to keep in your local files.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadJsonBackup}
                className="text-xs gap-1.5 shrink-0"
              >
                <Download className="size-3.5" /> Download (.json)
              </Button>
            </div>
          </TabsContent>

          {/* TAB 2: Import from Code or File */}
          <TabsContent value="import" className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Paste Sync Code or Transfer URL:</Label>
              <Textarea
                value={importCodeInput}
                onChange={(e) => setImportCodeInput(e.target.value)}
                placeholder="Paste the sync URL (e.g. https://.../dashboard?import_plan=...) or raw sync code here..."
                rows={3}
                className="font-mono text-xs"
              />
              <Button
                onClick={handleImportCode}
                disabled={!importCodeInput.trim()}
                className="w-full gap-2 text-xs font-semibold"
              >
                <ArrowRight className="size-3.5" /> Import & Restore Plan
              </Button>
            </div>

            <div className="relative py-2 text-center text-xs text-muted-foreground">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <span className="relative bg-background px-2">or upload file</span>
            </div>

            {/* Upload File Input */}
            <div className="rounded-xl border border-dashed border-border/80 p-5 text-center space-y-2 bg-muted/20">
              <FileJson className="size-7 mx-auto text-muted-foreground" />
              <div className="text-xs font-semibold text-foreground">
                Upload a .json Plan Backup File
              </div>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                Select a previously downloaded Cornerstone backup file from your computer.
              </p>
              <div className="pt-1">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm">
                  <Upload className="size-3.5 mr-1.5" /> Choose .json File
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
