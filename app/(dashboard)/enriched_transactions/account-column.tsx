import { useOpenAccount } from "@/features/accounts/hooks/use-open-account";

// Define properties for the component
type Props = {
  account: string;
  accountId: string;
};

// Account column component for displaying account names
export const AccountColumn = ({ account, accountId }: Props) => {
  const { onOpen: onOpenAccount } = useOpenAccount();

  // Function to handle account click event
  const onClick = () => {
    onOpenAccount(accountId);
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center cursor-pointer hover:underline"
    >
      {account}
    </div>
  );
};
