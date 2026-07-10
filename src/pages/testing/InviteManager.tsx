import { useState } from "react";
import { Icon } from "../../components/Icon";
import { useToasts } from "../../hooks/useToasts";
import { createInvite, getInvites, inviteState, inviteUrl, regenerateInvite, updateInvite } from "../../services/remoteTesting";
import type { LiveParticipantStatus, TestInvite, UsabilityTest } from "../../types/testing";

const STATE_LABEL: Record<ReturnType<typeof inviteState>, string> = {
  active: "Active",
  disabled: "Disabled",
  expired: "Expired",
  completed: "Completed",
};

export function InviteManager({ test, live }: { test: UsabilityTest; live: LiveParticipantStatus[] }) {
  const { pushToast } = useToasts();
  const [invites, setInvites] = useState<TestInvite[]>(() => getInvites(test.id));

  const refresh = () => setInvites(getInvites(test.id));

  const copy = async (invite: TestInvite) => {
    const url = inviteUrl(invite, test);
    try {
      if (!navigator.clipboard) throw new Error("clipboard API unavailable");
      await navigator.clipboard.writeText(url);
      pushToast({ icon: "link", title: "Link copied", message: url, tone: "success" });
      return;
    } catch {
      // Clipboard API can fail in embedded/iframe contexts, unfocused documents,
      // or without secure-context permissions — fall back to a hidden textarea
      // and the legacy execCommand copy, which works in those same contexts.
    }
    const textarea = document.createElement("textarea");
    textarea.value = url;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    document.body.removeChild(textarea);
    if (copied) {
      pushToast({ icon: "link", title: "Link copied", message: url, tone: "success" });
    } else {
      pushToast({ icon: "error", title: "Couldn't copy automatically", message: `Select and copy manually: ${url}`, tone: "danger" });
    }
  };

  const generate = () => {
    createInvite(test.id);
    refresh();
    pushToast({ icon: "add_link", title: "Testing link created", message: "Share it with a participant to start a remote session.", tone: "success" });
  };

  const duplicate = (invite: TestInvite) => {
    createInvite(test.id);
    refresh();
    pushToast({ icon: "content_copy", title: "Session duplicated", message: `A fresh link for ${invite.participantId} was created.`, tone: "success" });
  };

  const regenerate = (invite: TestInvite) => {
    regenerateInvite(invite.id);
    refresh();
    pushToast({ icon: "refresh", title: "Link regenerated", message: "The previous link no longer works.", tone: "info" });
  };

  const toggleDisabled = (invite: TestInvite) => {
    updateInvite(invite.id, { disabled: !invite.disabled });
    refresh();
  };

  const isLive = (invite: TestInvite) => live.some((status) => status.inviteCode === invite.code);

  return (
    <section className="qcx-card uts-invite-panel" aria-label="Remote testing links">
      <div className="qcx-section-head" style={{ marginBottom: 0 }}>
        <h2>Remote Testing Links</h2>
        <button className="qcx-button primary" onClick={generate}><Icon icon="add_link" size={17} />New Link</button>
      </div>
      {invites.length === 0 ? (
        <div className="uts-invite-empty">
          <span><Icon icon="link" size={18} /> No testing links yet — generate one to invite a remote participant.</span>
        </div>
      ) : (
        invites.map((invite) => {
          const state = inviteState(invite);
          const running = isLive(invite);
          return (
            <div className="uts-invite-row" key={invite.id}>
              <span className={`uts-invite-state ${state}`}>{running ? "Live now" : STATE_LABEL[state]}</span>
              <div className="uts-invite-link">
                {/* Display the short form; Copy Link carries the full share payload. */}
                <code>{`${window.location.origin}/#/test/${invite.code}`}</code>
                <small>{invite.participantId} · created {new Date(invite.createdAt).toLocaleDateString()} · expires {new Date(invite.expiresAt).toLocaleDateString()}</small>
              </div>
              <div className="uts-invite-actions">
                <button className="qcx-icon-button" aria-label="Copy link" title="Copy Link" onClick={() => copy(invite)}><Icon icon="content_copy" size={16} /></button>
                <button className="qcx-icon-button" aria-label="Regenerate link" title="Regenerate Link" onClick={() => regenerate(invite)}><Icon icon="refresh" size={16} /></button>
                <button className="qcx-icon-button" aria-label={invite.disabled ? "Enable link" : "Disable link"} title={invite.disabled ? "Enable Link" : "Disable Link"} onClick={() => toggleDisabled(invite)}>
                  <Icon icon={invite.disabled ? "toggle_off" : "toggle_on"} size={18} fill={!invite.disabled} />
                </button>
                <button className="qcx-icon-button" aria-label="Duplicate session" title="Duplicate Session" onClick={() => duplicate(invite)}><Icon icon="control_point_duplicate" size={16} /></button>
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}
