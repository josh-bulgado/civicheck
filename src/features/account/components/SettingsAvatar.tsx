import * as React from "react";
import { Camera, Trash2, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Spinner } from "~/components/ui/spinner";
import { AVATAR_ACCEPT } from "~/lib/avatar-image";
import {
  getDisplayName,
  getInitials,
  type AccountProfile,
} from "../account.types";
import { useAvatar } from "../hooks/useAvatar";

// A 32px badge with a hit area stretched to 44px, the touch minimum.
const badgeClassName =
  "civic-press absolute right-[-4px] bottom-[-4px] flex size-8 items-center justify-center rounded-full border border-(--settings-line) bg-white text-primary shadow-[0_2px_6px_rgba(15,27,45,0.16)] outline-none after:absolute after:-inset-1.5 after:content-[''] focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-60";

/**
 * The photo at the top of the Profile tab. The camera badge on the avatar adds
 * a photo, or opens a menu to change or remove the one that is there. Unlike
 * the fields below it, a change is saved the moment it is made, so it has no
 * part in Save and Cancel.
 */
export function SettingsAvatar({ account }: { account: AccountProfile }) {
  const { pending, upload, remove } = useAvatar(account.id);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const name = getDisplayName(account);
  const hasPhoto = Boolean(account.avatarUrl);

  const choosePhoto = () => inputRef.current?.click();

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared so choosing the same file again still fires a change.
    event.target.value = "";
    if (file) void upload(file);
  }

  const cameraIcon = <Camera className="size-4" aria-hidden="true" />;

  return (
    <div className="flex items-center gap-4 pt-3">
      <div className="relative size-18 shrink-0">
        <Avatar className="size-18">
          {account.avatarUrl ? (
            <AvatarImage src={account.avatarUrl} alt={`${name}'s photo`} />
          ) : null}
          <AvatarFallback className="bg-primary-soft text-2xl font-bold text-primary">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>

        {pending ? (
          <span
            className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70"
            role="status"
            aria-label="Updating photo"
          >
            <Spinner className="size-5 text-primary" />
          </span>
        ) : null}

        {hasPhoto ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              nativeButton
              disabled={pending}
              aria-label="Change profile photo"
              className={badgeClassName}
            >
              {cameraIcon}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="bottom"
              align="start"
              sideOffset={8}
              className="w-52 rounded-[16px] bg-white p-1.5 shadow-portal-menu ring-0"
            >
              <DropdownMenuItem
                onClick={choosePhoto}
                className="h-11 gap-2.5 rounded-[12px] px-3 text-sm font-medium focus:bg-portal-panel"
              >
                <Upload className="size-4.5" aria-hidden="true" />
                Upload new photo
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => void remove()}
                className="h-11 gap-2.5 rounded-[12px] px-3 text-sm font-medium"
              >
                <Trash2 className="size-4.5" aria-hidden="true" />
                Remove photo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={choosePhoto}
            aria-label="Add profile photo"
            className={badgeClassName}
          >
            {cameraIcon}
          </button>
        )}
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
