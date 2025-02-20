import { useAtom } from "jotai";
import { featureFlagsAtom } from "../lib/atoms";

export const SettingsPage = () => {
  const [featureFlags, setFeatureFlags] = useAtom(featureFlagsAtom);

  return (
    <div className="max-w-4xl mx-auto my-12 px-6">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Feature Flags</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Vim Mode</h3>
              <p className="text-sm text-gray-500">Enable Vim keybindings for text editing</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={featureFlags.vimMode}
                onChange={(e) => setFeatureFlags({ ...featureFlags, vimMode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </section>
    </div>
  );
};
