import { useEffect, useState } from "react";
import { listUserProfiles } from "../services/userService";
import { titleCaseUser } from "../utils/workoutUtils";

export function UserSwitcher({
  currentUsername,
  viewedUsername,
  isAdmin,
  onViewUser,
  onSignOut,
  signedInLabel,
}) {
  const [profiles, setProfiles] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      return undefined;
    }

    let active = true;

    listUserProfiles()
      .then((results) => {
        if (active) {
          setProfiles(results);
        }
      })
      .catch((error) => {
        console.error("Failed to load user profiles", error);
        if (active) {
          setProfiles([]);
        }
      });

    return () => {
      active = false;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="user-switch user-switch-static">
        <span>{signedInLabel}</span>
        <button className="ghost-button sign-out-btn" type="button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    );
  }

  const activeView = viewedUsername || currentUsername;
  const isViewingOther = viewedUsername && viewedUsername !== currentUsername;
  const profileOptions = profiles ?? [
    {
      id: currentUsername,
      username: currentUsername,
      displayName: signedInLabel,
    },
  ];

  return (
    <div className="admin-user-switch">
      <label className="admin-user-switch-label">
        <span>{isViewingOther ? "Viewing profile" : "Signed in as"}</span>
        <select
          value={activeView}
          onChange={(event) => {
            const nextValue = event.target.value;
            onViewUser(nextValue === currentUsername ? null : nextValue);
          }}
          disabled={!profiles}
        >
          {profileOptions.map((profile) => (
            <option key={profile.id} value={profile.username}>
              {profile.displayName || titleCaseUser(profile.username)}
              {profile.username === currentUsername ? " (you)" : ""}
            </option>
          ))}
        </select>
      </label>

      {isViewingOther && (
        <button
          className="ghost-button"
          type="button"
          onClick={() => onViewUser(null)}
        >
          Back to my data
        </button>
      )}

      <button className="ghost-button sign-out-btn" type="button" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
