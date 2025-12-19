import { useEffect, useMemo, useState } from "react";
import { Globe2, Link2, Mail, ShieldCheck } from "lucide-react";
import { PlannerState } from "@/types/planner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShareLinkAccess, ShareRole, addShareInvite, buildShareUrl, createShareRecord, updateShareLinkAccess } from "@/lib/sharePlanStore";
import { toast } from "@/components/ui/sonner";

interface SharePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  snapshot: PlannerState;
  ownerId: string | null;
  activeProfileId?: string;
}

export const SharePlanDialog = ({ open, onOpenChange, planName, snapshot, ownerId, activeProfileId }: SharePlanDialogProps) => {
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [linkAccess, setLinkAccess] = useState<ShareLinkAccess>("viewer");
  const [linkBusy, setLinkBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ShareRole>("viewer");

  const ownerSignedIn = Boolean(ownerId);
  const normalizedPlanName = planName || "Planner";

  useEffect(() => {
    if (!open) return;
    setShareId(null);
    setShareUrl("");
    setLinkBusy(false);
    setInviteBusy(false);
  }, [open]);

  const permissionsCopy = useMemo(() => {
    if (linkAccess === "editor") {
      return "Anyone with the link can edit";
    }
    if (linkAccess === "viewer") {
      return "Anyone with the link can view";
    }
    return "Link requires an invite";
  }, [linkAccess]);

  const ensureShareLink = async () => {
    if (!ownerId) {
      toast("Sign in to share", {
        description: "Create a free account to generate share links.",
      });
      return null;
    }

    if (shareId && shareUrl) {
      return { shareId, shareUrl } as const;
    }

    setLinkBusy(true);
    try {
      const newShareId = await createShareRecord({
        ownerId,
        planName: normalizedPlanName,
        snapshot,
        planProfileId: activeProfileId,
        linkAccess,
      });
      const url = buildShareUrl(newShareId);
      setShareId(newShareId);
      setShareUrl(url);
      toast("Share link ready", {
        description: "Send this link to let others view or edit.",
      });
      return { shareId: newShareId, shareUrl: url } as const;
    } catch (error) {
      console.error("Failed to create share link", error);
      toast("Unable to create share link", {
        description: "Try again in a moment.",
      });
      return null;
    } finally {
      setLinkBusy(false);
    }
  };

  const handleCopyLink = async () => {
    const result = await ensureShareLink();
    if (!result) return;
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast("Clipboard unavailable", {
        description: result.shareUrl,
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(result.shareUrl);
      toast("Link copied", {
        description: "Paste it into chat or email.",
      });
    } catch (error) {
      console.error("Unable to copy share link", error);
      toast("Copy failed", {
        description: result.shareUrl,
      });
    }
  };

  const handleInviteSubmit = async () => {
    const trimmedEmail = inviteEmail.trim();
    if (!trimmedEmail) {
      toast("Enter an email", { description: "Add someone to share access." });
      return;
    }
    if (!ownerId) {
      toast("Sign in to share", { description: "Invites are available after signing in." });
      return;
    }
    const result = await ensureShareLink();
    if (!result) return;

    setInviteBusy(true);
    try {
      const normalized = await addShareInvite({
        shareId: result.shareId,
        email: trimmedEmail,
        role: inviteRole,
        inviterId: ownerId,
      });
      setInviteEmail("");
      toast("Invite added", {
        description: `${normalized} can ${inviteRole === "editor" ? "edit" : "view"}.`,
      });
    } catch (error) {
      console.error("Unable to add share invite", error);
      toast("Invite failed", {
        description: "Check the email and try again.",
      });
    } finally {
      setInviteBusy(false);
    }
  };

  const handleLinkAccessChange = async (value: ShareLinkAccess) => {
    setLinkAccess(value);
    if (!shareId) return;
    setLinkBusy(true);
    const description = value === "editor"
      ? "Anyone with the link can edit"
      : value === "viewer"
        ? "Anyone with the link can view"
        : "Link requires an invite";
    try {
      await updateShareLinkAccess(shareId, value, snapshot);
      setShareUrl((prev) => prev || buildShareUrl(shareId));
      toast("Link access updated", {
        description,
      });
    } catch (error) {
      console.error("Unable to update link access", error);
      toast("Update failed", {
        description: "Try again in a moment.",
      });
    } finally {
      setLinkBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share your planner</DialogTitle>
          <DialogDescription>
            Generate a link or invite people by email. Shared users will see the latest saved copy of this plan.
          </DialogDescription>
        </DialogHeader>

        {!ownerSignedIn ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Sign in to create share links and invite collaborators.
          </div>
        ) : null}

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Link access</p>
                <p className="text-xs text-muted-foreground">Choose what people with the link can do.</p>
              </div>
              <Select value={linkAccess} onValueChange={(value) => handleLinkAccessChange(value as ShareLinkAccess)}>
                <SelectTrigger className="w-[200px]" disabled={linkBusy || !ownerSignedIn}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Anyone with link can view</SelectItem>
                  <SelectItem value="editor">Anyone with link can edit</SelectItem>
                  <SelectItem value="none">Link disabled (invite-only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4 space-y-3">
              <Button type="button" size="sm" onClick={ensureShareLink} disabled={linkBusy || !ownerSignedIn}>
                <Link2 className="mr-2 h-4 w-4" />
                {shareUrl ? "Regenerate link" : "Create share link"}
              </Button>
              {shareUrl ? (
                <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-background p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input readOnly value={shareUrl} className="flex-1" />
                    <Button type="button" variant="secondary" onClick={handleCopyLink} disabled={linkBusy}>
                      Copy
                    </Button>
                  </div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Globe2 className="h-3.5 w-3.5" />
                    {permissionsCopy}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No link yet. Create one to share with anyone.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Invite by email</p>
                <p className="text-xs text-muted-foreground">People will get access even if the link is off.</p>
              </div>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="share-email" className="text-xs text-muted-foreground">Email</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="share-email"
                  type="email"
                  placeholder="student@school.edu"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  className="min-w-[220px] flex-1"
                  disabled={!ownerSignedIn || inviteBusy}
                />
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as ShareRole)} disabled={!ownerSignedIn || inviteBusy}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleInviteSubmit} disabled={!ownerSignedIn || inviteBusy}>
                  <Mail className="mr-2 h-4 w-4" />
                  Add invite
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Editors can change the plan; viewers can only read. We log who invited each email.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="text-[11px] text-muted-foreground">
          Sharing keeps the latest saved snapshot of {normalizedPlanName}. Future edits will be synced when you save.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
