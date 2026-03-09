import { useState } from "react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2, RefreshCw, CheckCircle, XCircle, Eye, ImageIcon } from "lucide-react";
import { format } from "date-fns";

type RegenRequest = {
  id: string;
  order_id: string;
  order_ref: string;
  reason: string;
  status: string;
  original_photo_url: string | null;
  regenerated_photo_url: string | null;
  admin_note: string | null;
  client_ip: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function AdminRegenerations() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<RegenRequest | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null);
  const [generationRunId, setGenerationRunId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["regen-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regeneration_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RegenRequest[];
    },
  });

  const handleRegenerate = async () => {
    if (!selected) return;
    setRegenerating(true);
    try {
      const [{ data: order }, { data: sourceAssets }] = await Promise.all([
        supabase
          .from("orders")
          .select("category, photo_url, dream_job")
          .eq("id", selected.order_id)
          .single(),
        supabase
          .from("order_assets")
          .select("url, asset_kind")
          .eq("order_id", selected.order_id)
          .eq("asset_kind", "source")
          .order("created_at", { ascending: true }),
      ]);

      if (!order) throw new Error("Order not found");

      const sourceImages = (sourceAssets || []).map((asset) => asset.url).filter(Boolean);
      const images = sourceImages.length > 0 ? sourceImages : order.photo_url ? [order.photo_url] : [];

      const { data, error } = await supabase.functions.invoke("generate-creative", {
        body: {
          category: order.category,
          images,
          dreamJob: order.dream_job,
          orderId: selected.order_id,
          requestedBy: "admin_regeneration",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setNewPhotoUrl(data.imageUrl);
      setGenerationRunId(data.generationRunId || null);
    } catch (e: any) {
      console.error("Regeneration failed:", e);
      alert("Regeneration failed: " + (e.message || "Unknown error"));
    } finally {
      setRegenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!selected || !newPhotoUrl) return;
    setUpdating(true);
    try {
      await supabase
        .from("orders")
        .update({ photo_url: newPhotoUrl })
        .eq("id", selected.order_id);

      await supabase
        .from("order_assets")
        .insert({
          order_id: selected.order_id,
          generation_run_id: generationRunId,
          asset_kind: "regenerated",
          url: newPhotoUrl,
          label: "Approved regeneration",
          metadata: {
            requestId: selected.id,
            approvedAt: new Date().toISOString(),
          },
        });

      if (generationRunId) {
        const { data: generationRun } = await supabase
          .from("ai_generation_runs")
          .select("metadata")
          .eq("id", generationRunId)
          .maybeSingle();

        await supabase
          .from("ai_generation_runs")
          .update({
            metadata: {
              ...(generationRun?.metadata && typeof generationRun.metadata === "object" ? generationRun.metadata : {}),
              approved: true,
              approvedAt: new Date().toISOString(),
              requestId: selected.id,
            },
          })
          .eq("id", generationRunId);
      }

      await supabase
        .from("regeneration_requests")
        .update({
          status: "completed",
          regenerated_photo_url: newPhotoUrl,
          admin_note: adminNote || null,
        })
        .eq("id", selected.id);

      queryClient.invalidateQueries({ queryKey: ["regen-requests"] });
      setSelected(null);
      setNewPhotoUrl(null);
      setGenerationRunId(null);
      setAdminNote("");
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      await supabase
        .from("regeneration_requests")
        .update({
          status: "rejected",
          admin_note: adminNote || null,
        })
        .eq("id", selected.id);

      queryClient.invalidateQueries({ queryKey: ["regen-requests"] });
      setSelected(null);
      setGenerationRunId(null);
      setAdminNote("");
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSetInProgress = async (req: RegenRequest) => {
    await supabase
      .from("regeneration_requests")
      .update({ status: "in_progress" })
      .eq("id", req.id);
    queryClient.invalidateQueries({ queryKey: ["regen-requests"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Regeneration Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customer requests to regenerate AI-generated photos.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !requests?.length ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No regeneration requests yet.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Ref</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Photo</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-sm">{req.order_ref}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{req.reason}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[req.status] || ""} variant="secondary">
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {req.original_photo_url ? (
                      <img src={req.original_photo_url} alt="" className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(req.created_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelected(req);
                        setNewPhotoUrl(req.regenerated_photo_url);
                        setGenerationRunId(null);
                        setAdminNote(req.admin_note || "");
                      }}>
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      {req.status === "pending" && (
                        <Button size="sm" variant="secondary" onClick={() => handleSetInProgress(req)}>
                          Start
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Request — {selected?.order_ref}</SheetTitle>
          </SheetHeader>

          {selected && (
            <div className="mt-6 space-y-6">
              {/* Customer reason */}
              <div>
                <h4 className="text-sm font-semibold mb-1">Customer Reason</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">{selected.reason}</p>
              </div>

              {/* Original photo */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Original Photo</h4>
                {selected.original_photo_url ? (
                  <img src={selected.original_photo_url} alt="Original" className="w-full rounded-lg border" />
                ) : (
                  <p className="text-sm text-muted-foreground">No photo</p>
                )}
              </div>

              {/* Regenerate button */}
              {selected.status !== "completed" && selected.status !== "rejected" && (
                <Button onClick={handleRegenerate} disabled={regenerating} className="w-full">
                  {regenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating new photo...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate Photo
                    </>
                  )}
                </Button>
              )}

              {/* New photo preview */}
              {newPhotoUrl && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">New Photo Preview</h4>
                  <img src={newPhotoUrl} alt="Regenerated" className="w-full rounded-lg border" />
                </div>
              )}

              {/* Admin note */}
              <div>
                <h4 className="text-sm font-semibold mb-1">Admin Note (optional)</h4>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                />
              </div>

              {/* Action buttons */}
              {selected.status !== "completed" && selected.status !== "rejected" && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleApprove}
                    disabled={!newPhotoUrl || updating}
                    className="flex-1"
                  >
                    {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Approve & Replace
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={updating}
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              )}

              {/* Status info for completed/rejected */}
              {(selected.status === "completed" || selected.status === "rejected") && (
                <div className="flex items-center gap-2 p-3 rounded bg-muted">
                  {selected.status === "completed" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="text-sm font-medium capitalize">{selected.status}</span>
                  {selected.admin_note && (
                    <span className="text-xs text-muted-foreground ml-2">— {selected.admin_note}</span>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                IP: {selected.client_ip} • {format(new Date(selected.created_at), "dd/MM/yyyy HH:mm")}
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
