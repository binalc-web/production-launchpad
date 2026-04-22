import { createFileRoute } from '@tanstack/react-router';
import MasterChronologyDetail from '@/pages/MasterChronology/timeline/MasterChronologyDetail';

export const Route = createFileRoute('/_app/master-chronology/timeline/$id')({
  component: MasterChronologyDetail,
});
