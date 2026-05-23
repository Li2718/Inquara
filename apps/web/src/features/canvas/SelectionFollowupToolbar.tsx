"use client";

type SelectionFollowupToolbarProps = {
  onFollowUp(): void;
};

export function SelectionFollowupToolbar({ onFollowUp }: SelectionFollowupToolbarProps) {
  return (
    <div className="selection-toolbar">
      <button type="button" onClick={onFollowUp}>
        Ask follow-up
      </button>
    </div>
  );
}
