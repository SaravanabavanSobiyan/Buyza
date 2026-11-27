import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { getStockAlerts } from "../../api/adminInventory";
import { getErrorMessage } from "../../api/axios";
import Alert from "../../components/Alert";

export default function AdminHome() {
  const user = useSelector((state) => state.auth.user);
  const { data: alerts, isError, error } = useQuery({
    queryKey: ["admin", "inventory", "alerts"],
    queryFn: getStockAlerts,
  });

  return (
    <div>
      <h2 className="text-lg font-medium">Welcome, {user.name}</h2>
      {isError && <div className="mt-4"><Alert>{getErrorMessage(error)}</Alert></div>}
      {!isError && (
        <Link to="/admin/inventory" className="mt-4 block rounded-lg border border-amber-200 bg-amber-50 p-4 hover:bg-amber-100">
          <h3 className="font-medium">Inventory alerts</h3>
          <p className="mt-1 text-sm text-gray-700">
            {alerts?.low || 0} low-stock · {alerts?.out || 0} out-of-stock items
          </p>
        </Link>
      )}
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link to="/admin/products" className="rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50">
          Manage products
        </Link>
        <Link to="/admin/inventory" className="rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50">
          Manage inventory
        </Link>
        <Link to="/admin/categories" className="rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50">
          Manage categories
        </Link>
        <Link to="/admin/brands" className="rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50">
          Manage brands
        </Link>
      </div>
    </div>
  );
}
