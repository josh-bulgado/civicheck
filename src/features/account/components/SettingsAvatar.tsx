import * as React from "react";
import { Camera, Trash2, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { AVATAR_ACCEPT } from "~/lib/avatar-image";
import {
  getDisplayName,
  getInitials,
  type AccountProfile,
} from "../account.types";

// A 32px badge with a hit area stretched to 44px, the touch minimum.
const badgeClassName =
  "civic-press absolute right-[-4px] bottom-[-4px] flex size-8 items-center justify-center rounded-full border border-(--settings-line) bg-card text-primary shadow-[0_2px_6px_rgba(15,27,45,0.16)] outline-none after:absolute after:-inset-1.5 after:content-[''] focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-60";

/**
 * The photo at the top of the Profile tab, with visible controls to change or
 * remove the current preview. The profile form owns the pending change and
 * saves it with Save changes.
 */
export function SettingsAvatar({
  account,
  avatarUrl,
  pending,
  onSelect,
  onRemove,
}: {
  account: AccountProfile;
  avatarUrl: string | null;
  pending: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const name = getDisplayName(account);
  const hasPhoto = Boolean(avatarUrl);

  const choosePhoto = () => inputRef.current?.click();

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared so choosing the same file again still fires a change.
    event.target.value = "";
    if (file) onSelect(file);
  }

  const cameraIcon = <Camera className="size-4" aria-hidden="true" />;

  return (
    <div className="flex items-center gap-4 pt-3">
      <div className="relative size-18 shrink-0">
        <Avatar className="size-18">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={`${name}'s photo`} />
          ) : null}
          <AvatarFallback className="bg-primary-soft text-2xl font-bold text-primary">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>

        {pending ? (
          <span
            className="absolute inset-0 flex items-center justify-center rounded-full bg-card/70"
            role="status"
            aria-label="Updating photo"
          >
            <Spinner className="size-5 text-primary" />
          </span>
        ) : null}

        <button
          type="button"
          disabled={pending}
          onClick={choosePhoto}
          aria-label={hasPhoto ? "Change profile photo" : "Add profile photo"}
          className={badgeClassName}
        >
          {cameraIcon}
        </button>
      </div>

      {/* The sidebar already names the person from `md`, so there the text
          labels the photo; on a phone it says whose photo this is. */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-base leading-6 font-semibold text-foreground md:hidden">
          {name}
        </p>
        <p className="truncate text-[13px] leading-[18px] text-body-2 md:hidden">
          {account.email}
        </p>
        <p className="hidden text-[15px] leading-5 font-semibold text-foreground md:block">
          Profile photo
        </p>
        <p className="hidden text-[13px] leading-[18px] text-body-2 md:block">
          JPG, PNG or WebP. It is cropped to a square.
        </p>
        <p className="text-[13px] leading-[18px] text-body-2">
          Click Save changes to apply your photo.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="touch"
            disabled={pending}
            onClick={choosePhoto}
            className="border-(--settings-line) bg-card text-sm shadow-none"
          >
            <Upload className="size-4" aria-hidden="true" />
            {hasPhoto ? "Change photo" : "Upload photo"}
          </Button>
          {hasPhoto ? (
            <Button
              type="button"
              variant="ghost"
              size="touch"
              disabled={pending}
              onClick={onRemove}
              className="text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Remove photo
            </Button>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        onChange={handleFile}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
