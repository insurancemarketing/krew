import { Suspense } from "react";
import { getContacts } from "@/lib/data";
import ContactsTable from "@/components/contacts/ContactsTable";
import { TableSkeleton } from "@/components/ui/Skeleton";

interface ContactsPageProps {
  searchParams: {
    search?: string;
    stage?: string;
    page?: string;
  };
}

const PER_PAGE = 50;

async function ContactsContent({ searchParams }: ContactsPageProps) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const { contacts, total } = await getContacts({
    search: searchParams.search,
    stage: searchParams.stage,
    page,
    perPage: PER_PAGE,
  });

  return (
    <ContactsTable
      contacts={contacts}
      total={total}
      page={page}
      perPage={PER_PAGE}
    />
  );
}

export default function ContactsPage({ searchParams }: ContactsPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <p className="mt-1 text-sm text-gray-500">
          All contacts with their attribution source and pipeline status.
        </p>
      </div>

      <Suspense fallback={<TableSkeleton rows={10} cols={7} />}>
        <ContactsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
