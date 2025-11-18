import { Loader } from '@/components/loader/loader';
import { useIntegrationStore } from '../../stores/use-integration-store';

export function AppLoaderContainer() {
  const isLoading = useIntegrationStore((store) => store.savingStatus === 'disabled');

  return <Loader isLoading={isLoading} isSemiTransparent={true} />;
}
