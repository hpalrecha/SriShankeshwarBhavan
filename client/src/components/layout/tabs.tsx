interface TabsProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export default function Tabs({ currentTab, onTabChange }: TabsProps) {
  const tabs = [
    { id: "booking", label: "Guest Booking", path: "/" },
    { id: "admin", label: "Admin Dashboard", path: "/admin" },
    { id: "trustee", label: "Trustee Management", path: "/trustee" },
  ];

  const handleTabClick = (tabId: string, path: string) => {
    onTabChange(tabId);
    window.history.pushState({}, "", path);
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`py-4 px-1 border-b-2 font-medium text-sm focus:outline-none transition-colors ${
                currentTab === tab.id
                  ? "border-brand-orange text-brand-orange"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => handleTabClick(tab.id, tab.path)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
