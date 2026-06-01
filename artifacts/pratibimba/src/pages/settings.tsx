export default function SettingsPage() {
  return (
    <div className="p-8 space-y-8 max-w-[800px]">
      <h2 className="font-headline-md text-on-surface">Settings</h2>

      <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline-sm">Profile Settings</h3>
          <p className="font-body-md text-on-surface-variant mt-1">Manage your account information</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-on-secondary font-bold text-xl">AI</div>
            <div>
              <p className="font-body-lg font-bold text-on-surface">Ananya Iyer</p>
              <p className="font-body-md text-on-surface-variant">Chief Auditor</p>
            </div>
            <button className="ml-auto px-4 py-2 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors">Change Photo</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Full Name", value: "Ananya Iyer" },
              { label: "Role", value: "Chief Auditor" },
              { label: "Email", value: "ananya.iyer@rashtrotthana.org" },
              { label: "Phone", value: "+91 98765 43210" },
            ].map((field) => (
              <div key={field.label} className="space-y-1.5">
                <label className="font-label-md text-on-surface-variant block">{field.label}</label>
                <input type="text" defaultValue={field.value} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button className="px-6 py-2.5 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors">Cancel</button>
            <button className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all">Save Changes</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline-sm">Notification Preferences</h3>
        </div>
        <div className="p-6 space-y-4">
          {[
            { label: "Email notifications for audit updates", defaultChecked: true },
            { label: "Push notifications for escalations", defaultChecked: true },
            { label: "Weekly summary reports", defaultChecked: false },
            { label: "System maintenance alerts", defaultChecked: true },
          ].map((pref) => (
            <div key={pref.label} className="flex items-center justify-between py-2 border-b border-outline-variant/10 last:border-0">
              <span className="font-body-md text-on-surface">{pref.label}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={pref.defaultChecked} className="sr-only peer" />
                <div className="w-11 h-6 bg-outline-variant peer-checked:bg-primary rounded-full transition-colors peer-focus:ring-2 peer-focus:ring-primary/20 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline-sm">Security</h3>
        </div>
        <div className="p-6 space-y-4">
          <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-outline-variant/30 hover:bg-surface-container-low transition-colors">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">lock</span>
              <span className="font-body-md font-medium">Change Password</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </button>
          <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-outline-variant/30 hover:bg-surface-container-low transition-colors">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">shield</span>
              <span className="font-body-md font-medium">Two-Factor Authentication</span>
            </div>
            <span className="px-2 py-0.5 bg-secondary/10 text-secondary font-label-md rounded font-bold text-[10px]">ENABLED</span>
          </button>
        </div>
      </div>
    </div>
  );
}
