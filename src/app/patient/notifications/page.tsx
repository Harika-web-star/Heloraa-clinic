import { createClient } from "@/lib/supabase/server";

export default async function PatientNotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  return (
    <main className="page-shell min-h-screen bg-[#F8FAFC] p-8">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <div>
          <p className="text-sm font-medium text-slate-500">
            Heloraa Clinic
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0A0D14]">
            Notifications
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Stay updated with your appointments, reports and
            follow-ups.
          </p>
        </div>

        {/* Notifications */}
        <div className="space-y-3">

          {!notifications ||
          notifications.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-slate-500">
                No notifications yet.
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">

                  <div>
                    <h2 className="font-medium text-[#0A0D14]">
                      {notification.title}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {notification.message}
                    </p>
                  </div>

                  {!notification.read && (
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#0A0D14]" />
                  )}

                </div>

                <p className="mt-4 text-xs text-slate-400">
                  {new Date(
                    notification.created_at
                  ).toLocaleString()}
                </p>
              </div>
            ))
          )}

        </div>
      </div>
    </main>
  );
}