import { formatMoney } from "../utils/money";
import useInView from "../hooks/useInView";
import StickyActionBar from "./common/StickyActionBar";

export default function StickyProductActions({
  targetRef,
  price,
  priceFrom = false,
  needsChoice = false,
  onChooseOption,
  children,
}) {
  const actionsInView = useInView(targetRef);
  if (actionsInView !== false) return null;

  return (
    <StickyActionBar>
      <span className="shrink-0 text-sm font-semibold text-gray-900">
        {priceFrom && <span className="mr-1 font-normal text-gray-500">From</span>}
        {formatMoney(price)}
      </span>
      {needsChoice ? (
        <button
          type="button"
          onClick={onChooseOption}
          className="min-h-11 flex-1 rounded-xl bg-[#46382f] px-3 text-sm font-semibold text-white"
        >
          Choose options
        </button>
      ) : children}
    </StickyActionBar>
  );
}
