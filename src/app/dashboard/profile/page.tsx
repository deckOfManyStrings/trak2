import { ProfileForm } from "@/app/dashboard/profile/profile-form";
import { getSessionProfile } from "@/utils/supabase/session";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await getSessionProfile();
  if (!session) redirect("/");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Update your name. This is how you appear on checklists.
        </p>
      </div>

      <ProfileForm
        email={session.email}
        fullName={session.profile.full_name}
      />
    </div>
  );
}
