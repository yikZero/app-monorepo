import { Stack } from '@onekeyhq/components';
import type { IStackProps } from '@onekeyhq/components';

// Demo (OK-67574): risk is red everywhere, yellow is kept for long-unused
// approvals. Sized like the header notification dot; the border matches the
// surface behind the dot.
export function RiskApprovalsDot(props: IStackProps) {
  return (
    <Stack
      w="$3"
      h="$3"
      borderRadius="$full"
      bg="$bgCriticalStrong"
      borderWidth="$0.5"
      borderColor="$bgApp"
      pointerEvents="none"
      {...props}
    />
  );
}
