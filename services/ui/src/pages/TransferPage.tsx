import { FormEvent, useEffect, useState } from "react";
import {
  createTransfer,
  getTransferRecipients,
  TransferRecipient
} from "../services/transferApi";
import { PageShell } from "../components/PageShell";

export function TransferPage() {
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [recipients, setRecipients] = useState<TransferRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem("auth");
    if (!auth) {
      setError("Please login first.");
      setLoadingRecipients(false);
      return;
    }
    const authPayload = JSON.parse(auth) as { accessToken: string; userId: string };
    const token = authPayload.accessToken;
    const currentUserId = authPayload.userId;
    getTransferRecipients(token)
      .then((response) => {
        const filteredRecipients = response.recipients.filter(
          (recipient) => recipient.userId !== currentUserId
        );
        setRecipients(filteredRecipients);
        if (filteredRecipients.length > 0) {
          setDestinationAccountId(filteredRecipients[0].accountId);
        }
      })
      .catch(() => setError("Unable to load recipients."))
      .finally(() => setLoadingRecipients(false));
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const auth = localStorage.getItem("auth");
    if (!auth) {
      setError("Please login first.");
      return;
    }
    if (recipients.length === 0) {
      setError("No recipients available. Register another user first.");
      return;
    }
    if (!destinationAccountId) {
      setError("Please select a recipient.");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0.01) {
      setError("Amount must be at least 0.01.");
      return;
    }

    const token = JSON.parse(auth).accessToken as string;
    const idempotencyKey = crypto.randomUUID();
    setError(null);
    setMessage(null);
    try {
      await createTransfer(token, idempotencyKey, {
        destinationAccountId,
        amount: parsedAmount
      });
      setMessage("Transfer submitted");
      setAmount("");
    } catch {
      setError("Transfer failed. Please check recipient and amount.");
    }
  };

  return (
    <PageShell title="Money transfer">
      <p className="page-subtitle">Transfers are retry-safe using idempotency keys behind the scenes.</p>
      {!loadingRecipients && recipients.length === 0 ? (
        <p className="status status-info">
          No recipients available. Register another user account first, then come back to transfer.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="stack">
        <div>
          <label className="label" htmlFor="destination">
            Recipient
          </label>
          <select
            id="destination"
            className="input"
            value={destinationAccountId}
            onChange={(e) => setDestinationAccountId(e.target.value)}
            disabled={loadingRecipients || recipients.length === 0}
          >
            {recipients.length === 0 ? (
              <option value="">No recipients available</option>
            ) : (
              recipients.map((recipient) => (
                <option key={recipient.accountId} value={recipient.accountId}>
                  @{recipient.username}
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="amount">
            Amount
          </label>
          <input
            id="amount"
            className="input"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <button
          className="button"
          type="submit"
          disabled={
            loadingRecipients ||
            recipients.length === 0 ||
            !destinationAccountId ||
            !Number.isFinite(Number(amount)) ||
            Number(amount) < 0.01
          }
        >
          Submit transfer
        </button>
      </form>
      {error ? <p className="status status-error">{error}</p> : null}
      {message ? (
        <p className={`status ${message.includes("failed") ? "status-error" : "status-ok"}`}>
          {message}
        </p>
      ) : null}
    </PageShell>
  );
}
