export default function SettingsPage() {
  return (
    <div className="p-8 max-w-4xl">
      <h2 className="font-headline-md text-on-surface mb-8">Settings</h2>

      <div className="space-y-8">
        {/* Profile Section */}
        <section className="bg-white rounded-xl shadow-soft p-6">
          <h3 className="font-headline-sm text-on-surface mb-6">
            Profile Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block font-label-md font-semibold text-on-surface-variant">
                Full Name
              </label>
              <input
                type="text"
                defaultValue="Ananya Iyer"
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="block font-label-md font-semibold text-on-surface-variant">
                Email Address
              </label>
              <input
                type="email"
                defaultValue="ananya.iyer@rashtrotthana.org"
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="block font-label-md font-semibold text-on-surface-variant">
                Department
              </label>
              <select className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                <option>Compliance & Audit</option>
                <option>Finance</option>
                <option>Operations</option>
                <option>HR</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block font-label-md font-semibold text-on-surface-variant">
                Role
              </label>
              <input
                type="text"
                defaultValue="Chief Auditor"
                disabled
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-surface-container-low cursor-not-allowed"
              />
            </div>
          </div>
        </section>

        {/* Notification Preferences */}
        <section className="bg-white rounded-xl shadow-soft p-6">
          <h3 className="font-headline-sm text-on-surface mb-6">
            Notification Preferences
          </h3>
          <div className="space-y-4">
            {[
              {
                title: "Email Notifications",
                desc: "Receive audit updates via email",
              },
              {
                title: "Push Notifications",
                desc: "Browser push notifications for urgent items",
              },
              {
                title: "Escalation Alerts",
                desc: "Immediate alerts for escalated audits",
              },
              {
                title: "Weekly Digest",
                desc: "Weekly summary of audit activities",
              },
            ].map((pref, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-3 border-b border-outline-variant/20 last:border-0"
              >
                <div>
                  <p className="font-body-md font-semibold text-on-surface">
                    {pref.title}
                  </p>
                  <p className="font-label-md text-on-surface-variant">
                    {pref.desc}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={idx < 3}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* Security Settings */}
        <section className="bg-white rounded-xl shadow-soft p-6">
          <h3 className="font-headline-sm text-on-surface mb-6">Security</h3>
          <div className="space-y-4">
            <button className="w-full text-left p-4 border border-outline-variant/30 rounded-lg hover:bg-surface-container-low transition-colors flex justify-between items-center">
              <div>
                <p className="font-body-md font-semibold text-on-surface">
                  Change Password
                </p>
                <p className="font-label-md text-on-surface-variant">
                  Last changed 30 days ago
                </p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">
                chevron_right
              </span>
            </button>
            <button className="w-full text-left p-4 border border-outline-variant/30 rounded-lg hover:bg-surface-container-low transition-colors flex justify-between items-center">
              <div>
                <p className="font-body-md font-semibold text-on-surface">
                  Two-Factor Authentication
                </p>
                <p className="font-label-md text-on-surface-variant">
                  Add an extra layer of security
                </p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">
                chevron_right
              </span>
            </button>
            <button className="w-full text-left p-4 border border-outline-variant/30 rounded-lg hover:bg-surface-container-low transition-colors flex justify-between items-center">
              <div>
                <p className="font-body-md font-semibold text-on-surface">
                  Active Sessions
                </p>
                <p className="font-label-md text-on-surface-variant">
                  Manage devices where you&apos;re logged in
                </p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">
                chevron_right
              </span>
            </button>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button className="px-6 py-3 border border-outline rounded-lg font-label-md font-bold text-on-surface hover:bg-surface-container-low transition-colors">
            Cancel
          </button>
          <button className="px-8 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold shadow-md hover:bg-primary-container transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
