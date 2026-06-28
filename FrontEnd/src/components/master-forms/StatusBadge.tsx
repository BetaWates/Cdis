import { Badge, ProcessingBadge } from '../ui/badge';
import { MasterForm } from '../../types';

/** Status badge for MasterForm — shared between MasterFormsList and MasterFormDetail. */
export function StatusBadge({ status }: { status: MasterForm['status'] }) {
  if (status === 'PROCESSING') return <ProcessingBadge />;
  if (status === 'ACTIVE') return <Badge variant="active">Active</Badge>;
  if (status === 'DRAFT') return <Badge variant="draft">Draft</Badge>;
  return <Badge variant="archived">Archived</Badge>;
}
