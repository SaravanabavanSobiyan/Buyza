import { passwordStrength } from "../utils/validators";

const labels = ["Too weak", "Weak", "Okay", "Good", "Strong"];
const colors = ["bg-gray-200", "bg-red-400", "bg-yellow-400", "bg-green-400", "bg-green-600"];

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const score = passwordStrength(password);
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded ${i <= score ? colors[score] : "bg-gray-200"}`} />
        ))}
      </div>
      <p className="mt-1 text-xs text-gray-500">{labels[score]}</p>
    </div>
  );
}
