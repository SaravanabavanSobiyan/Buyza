import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} from "../../api/account";
import { getErrorMessage } from "../../api/axios";
import Button from "../../components/Button";
import Alert from "../../components/Alert";
import AddressModal from "./AddressModal";

export default function Addresses() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // null | { address: object | null }
  const [actionError, setActionError] = useState("");

  const { data: addresses = [], isLoading, isError, error } = useQuery({
    queryKey: ["addresses"],
    queryFn: getAddresses,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["addresses"] });
  const onError = (err) => setActionError(getErrorMessage(err));

  const saveMutation = useMutation({
    mutationFn: (payload) => (modal.address ? updateAddress({ id: modal.address._id, ...payload }) : createAddress(payload)),
    onSuccess: refresh,
  });
  const defaultMutation = useMutation({ mutationFn: setDefaultAddress, onSuccess: refresh, onError });
  const deleteMutation = useMutation({ mutationFn: deleteAddress, onSuccess: refresh, onError });

  const handleDelete = (a) => {
    setActionError("");
    if (window.confirm("Delete this address?")) deleteMutation.mutate(a._id);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Addresses</h2>
        <Button onClick={() => setModal({ address: null })}>Add address</Button>
      </div>

      <div className="mt-4 space-y-3">
        <Alert>{actionError}</Alert>
        {isLoading && <p className="text-sm text-gray-500">Loading addresses…</p>}
        {isError && <Alert>{getErrorMessage(error)}</Alert>}
        {!isLoading && !isError && addresses.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="font-medium">Add your first address</p>
            <p className="mt-1 text-sm text-gray-500">Saved addresses make checkout faster.</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <div key={a._id} className={`rounded-lg border p-4 text-sm ${a.isDefault ? "border-blue-400" : "border-gray-200"}`}>
              <div className="mb-2 flex items-center gap-2">
                {a.label && <span className="font-medium">{a.label}</span>}
                {a.isDefault && <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">Default</span>}
              </div>
              <p className="font-medium">{a.fullName}</p>
              <p className="text-gray-600">
                {a.line1}
                {a.line2 && `, ${a.line2}`}
                <br />
                {a.city}
                {a.province && `, ${a.province}`} {a.postalCode}
                <br />
                {a.country}
              </p>
              <p className="mt-1 text-gray-600">{a.phone}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <button className="text-blue-600 hover:underline" onClick={() => setModal({ address: a })}>
                  Edit
                </button>
                {!a.isDefault && (
                  <button className="text-blue-600 hover:underline" onClick={() => defaultMutation.mutate(a._id)}>
                    Set as default
                  </button>
                )}
                <button className="text-red-600 hover:underline" onClick={() => handleDelete(a)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <AddressModal
          address={modal.address}
          onClose={() => setModal(null)}
          onSubmit={(payload) => saveMutation.mutateAsync(payload)}
        />
      )}
    </div>
  );
}
