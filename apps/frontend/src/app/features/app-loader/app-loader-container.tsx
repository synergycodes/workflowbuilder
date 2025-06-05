import { Loader } from '@/components/loader/loader';
import useStore from '@/store/store';
import { StatusType } from '@workflow-builder/types/common';

export function AppLoaderContainer() {
  const loadDiagramStatus = useStore((store) => store.loadDiagramStatus);
  const isLoading = loadDiagramStatus === StatusType.Loading;

  return <Loader isLoading={isLoading} isSemiTransparent={true} />;
}
