const STATUS_MAP = {
  DRAFT:       'draft',
  CONFIRMED:   'confirmed',
  IN_PROGRESS: 'in_progress',
  DELIVERED:   'delivered',
  RECEIVED:    'received',
  COMPLETED:   'completed',
  CANCELLED:   'cancelled',
  PURCHASE:    'purchase',
  MANUFACTURING: 'manufacturing',
  MTS: 'confirmed',
  MTO: 'warning',
};

export default function Badge({ status }) {
  const key = STATUS_MAP[status] || 'draft';
  return (
    <span className={`badge badge-${key}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}
