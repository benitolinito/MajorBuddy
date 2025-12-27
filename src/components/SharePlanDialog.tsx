import { useEffect, useMemo, useState } from "react";
import { Globe2, Link2, Lock, Mail, ShieldCheck } from "lucide-react";
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
import { ShareLinkAccess, ShareRole, addShareInvite, buildShareUrl, updateShareLinkAccess, upsertShareRecord } from "@/lib/sharePlanStore";
import { toast } from "@/components/ui/sonner";

interface SharePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  snapshot: PlannerState;
  ownerId: string | null;
  activeProfileId?: string;
  existingShareId?: string | null;
  existingLinkAccess?: ShareLinkAccess;
  existingShareOwnerId?: string | null;
  onSharePersist?: (payload: { shareId: string; linkAccess: ShareLinkAccess }) => void;
}

export const SharePlanDialog = ({ open, onOpenChange, planName, snapshot, ownerId, activeProfileId, existingShareId, existingLinkAccess, existingShareOwnerId, onSharePersist }: SharePlanDialogProps) => {
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [linkAccess, setLinkAccess] = useState<ShareLinkAccess>(existingLinkAccess ?? (existingShareId ? "viewer" : "none"));
  const [linkBusy, setLinkBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ShareRole>("viewer");

  const ownerSignedIn = Boolean(ownerId);
  const normalizedPlanName = planName || "Planner";
  const shareOwnerId = existingShareOwnerId ?? null;
  const canEditAccess = ownerSignedIn && (!shareOwnerId || shareOwnerId === ownerId);

  useEffect(() => {
    if (!open) return;
    const normalizedShareId = existingShareId?.trim() || null;
    setShareId(normalizedShareId);
    setShareUrl(normalizedShareId ? buildShareUrl(normalizedShareId) : "");
    setLinkAccess(existingLinkAccess ?? (normalizedShareId ? "viewer" : "none"));
    setLinkBusy(false);
    setInviteBusy(false);
  }, [existingLinkAccess, existingShareId, open]);

  const permissionsCopy = useMemo(() => {
    if (linkAccess === "editor") {
      return "Anyone with the link can edit";
    }
    if (linkAccess === "viewer") {
      return "Anyone with the link can view";
    }
    return "Only invited people can open this link";
  }, [linkAccess]);
  const roleLabel = linkAccess === "editor" ? "Editor" : "Viewer";
  const roleCopy = linkAccess === "editor" ? "Editors can change this plan." : "Viewers can only read.";
  const generalAccessValue = linkAccess === "none" ? "restricted" : "anyone";

  const ensureShareLink = async (desiredAccess?: ShareLinkAccess) => {
    if (!ownerId) {
      const existing = shareId ?? existingShareId;
      if (existing) {
        const url = buildShareUrl(existing);
        setShareId(existing);
        setShareUrl(url);
        return { shareId: existing, shareUrl: url, linkAccess };
      }
      toast("Sign in to share", {
        description: "Create a free account to generate share links.",
      });
      return null;
    }

    if (ownerId && shareOwnerId && shareOwnerId !== ownerId) {
      const existing = shareId ?? existingShareId;
      if (existing) {
        const url = buildShareUrl(existing);
        setShareId(existing);
        setShareUrl(url);
        toast("View only", {
          description: "Only the owner can change this link's access.",
        });
        return { shareId: existing, shareUrl: url, linkAccess };
      }
      toast("View only", {
        description: "Only the owner can change this link's access.",
      });
      return null;
    }

    const targetAccess = desiredAccess ?? linkAccess;
    const isNewLink = !shareId && !existingShareId;
    setLinkBusy(true);
    try {
      const newShareId = await upsertShareRecord({
        shareId: shareId ?? existingShareId ?? null,
        ownerId,
        planName: normalizedPlanName,
        snapshot,
        planProfileId: activeProfileId,
        linkAccess: targetAccess,
      });
      const url = buildShareUrl(newShareId);
      setShareId(newShareId);
      setShareUrl(url);
      setLinkAccess(targetAccess);
      onSharePersist?.({ shareId: newShareId, linkAccess: targetAccess });
      if (isNewLink) {
        toast("Share link ready", {
          description: targetAccess === "none" ? "Invites only. Enable access to share broadly." : "Send this link to let others view or edit.",
        });
      }
      return { shareId: newShareId, shareUrl: url, linkAccess: targetAccess } as const;
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
    if (!canEditAccess) {
      toast("View only", { description: "Only the owner can add invites." });
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
    if (!canEditAccess) {
      toast("View only", {
        description: "Only the owner can change this link.",
      });
      return;
    }
    setLinkAccess(value);
    const activeShareId = shareId ?? existingShareId;
    if (!activeShareId) {
      if (value === "none") {
        setShareUrl("");
        return;
      }
      await ensureShareLink(value);
      return;
    }
    setLinkBusy(true);
    const description = value === "editor"
      ? "Anyone with the link can edit"
      : value === "viewer"
        ? "Anyone with the link can view"
        : "Link disabled. Invites only.";
    try {
      await updateShareLinkAccess(activeShareId, value, snapshot);
      setShareId(activeShareId);
      setShareUrl((prev) => prev || buildShareUrl(activeShareId));
      onSharePersist?.({ shareId: activeShareId, linkAccess: value });
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

  const handleGeneralAccessChange = (value: "restricted" | "anyone") => {
    const nextAccess: ShareLinkAccess =
      value === "restricted" ? "none" : linkAccess === "editor" ? "editor" : "viewer";
    void handleLinkAccessChange(nextAccess);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share your planner</DialogTitle>
          <DialogDescription>
            Manage a single share link for this plan. Choose general access or invite people directly; viewers always see the latest saved copy.
          </DialogDescription>
        </DialogHeader>

        {!ownerSignedIn ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Sign in to create share links and invite collaborators.
          </div>
        ) : null}

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    linkAccess === "none" ? "bg-muted text-muted-foreground" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {linkAccess === "none" ? <Lock className="h-5 w-5" /> : <Globe2 className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">General access</p>
                  <p className="text-xs text-muted-foreground">{permissionsCopy}</p>
                </div>
              </div>
              <Select value={generalAccessValue} onValueChange={(value) => handleGeneralAccessChange(value as "restricted" | "anyone")}>
                <SelectTrigger className="w-[200px]" disabled={linkBusy || !canEditAccess}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restricted">Restricted</SelectItem>
                  <SelectItem value="anyone">Anyone with the link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {linkAccess !== "none" ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Role</p>
                  <p className="text-sm font-semibold text-foreground">{roleLabel}</p>
                  <p className="text-xs text-muted-foreground">{roleCopy}</p>
                </div>
                <Select value={linkAccess} onValueChange={(value) => void handleLinkAccessChange(value as ShareLinkAccess)} disabled={linkBusy || !canEditAccess}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/60 p-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                <span>Only people you invite can open this link.</span>
              </div>
            )}

            <div className="space-y-2 rounded-xl border border-dashed border-border bg-background/80 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Input
                  readOnly
                  value={shareUrl}
                  placeholder="Create a link to share"
                  className="flex-1"
                />
                <Button type="button" variant={shareUrl ? "secondary" : "default"} onClick={handleCopyLink} disabled={linkBusy}>
                  <Link2 className="mr-2 h-4 w-4" />
                  {shareUrl ? "Copy link" : "Create link"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{permissionsCopy}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
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
                  disabled={!canEditAccess || inviteBusy}
                />
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as ShareRole)} disabled={!canEditAccess || inviteBusy}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleInviteSubmit} disabled={!canEditAccess || inviteBusy}>
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
          We keep this link synced to your latest edits on {normalizedPlanName}. Invites stay active even when general access is restricted.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
