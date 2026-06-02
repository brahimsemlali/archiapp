"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Send, Trash2, MessageCircle } from "lucide-react";
import { createCommentAction, deleteCommentAction, type Comment } from "@/lib/actions/comments";
import { cn } from "@/lib/utils";

interface CommentsSectionProps {
  resourceType: string;
  resourceId: string;
  initialComments: (Comment & { author_email?: string })[];
  currentUserId: string;
  canModerate?: boolean;
  revalidatePath?: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export function CommentsSection({
  resourceType,
  resourceId,
  initialComments,
  currentUserId,
  canModerate = false,
  revalidatePath: revalidatePathProp,
}: CommentsSectionProps) {
  const [commentSnapshot, setCommentSnapshot] = useState({
    source: initialComments,
    comments: initialComments,
  });
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (commentSnapshot.source !== initialComments) {
    setCommentSnapshot({ source: initialComments, comments: initialComments });
  }

  const comments = commentSnapshot.comments;
  const setComments = (
    update:
      | (Comment & { author_email?: string })[]
      | ((currentComments: (Comment & { author_email?: string })[]) => (Comment & { author_email?: string })[])
  ) => {
    setCommentSnapshot((current) => ({
      source: current.source,
      comments: typeof update === "function" ? update(current.comments) : update,
    }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    const result = await createCommentAction(resourceType, resourceId, body, revalidatePathProp);
    setSaving(false);
    if (!result.ok) { toast.error(result.error); return; }
    setComments((prev) => [...prev, result.data]);
    setBody("");
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteCommentAction(id, revalidatePathProp);
    setDeletingId(null);
    if (!result.ok) { toast.error(result.error); return; }
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700">
          Commentaires {comments.length > 0 && <span className="text-slate-400 font-normal">({comments.length})</span>}
        </h3>
      </div>

      {comments.length === 0 && (
        <p className="text-xs text-slate-400 italic py-2">Aucun commentaire.</p>
      )}

      <div className="space-y-3">
        {comments.map((c) => {
          const initials = (c.author_email ?? "?")[0]?.toUpperCase() ?? "?";
          const isMine = c.author_id === currentUserId;
          const canDelete = isMine || canModerate;
          return (
            <div key={c.id} className="flex gap-2.5 group">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-semibold shrink-0 mt-0.5">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-700">
                    {c.author_email?.split("@")[0] ?? "Utilisateur"}
                  </span>
                  <span className="text-[10px] text-slate-400">{timeAgo(c.created_at)}</span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      aria-label="Supprimer le commentaire"
                      className={cn(
                        "ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500",
                        deletingId === c.id && "opacity-100"
                      )}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-700 mt-0.5 leading-snug whitespace-pre-wrap">{c.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Écrire un commentaire…"
          rows={2}
          className="flex-1 resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
        />
        <Button type="submit" size="icon" disabled={saving || !body.trim()} className="self-end shrink-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
      <p className="text-[10px] text-slate-400">⌘↵ pour envoyer</p>
    </div>
  );
}
