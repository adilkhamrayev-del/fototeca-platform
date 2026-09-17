import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import OrderConfigurator from "@/components/order/OrderConfigurator";
import WideFormatConfigurator from "@/components/order/WideFormatConfigurator";
import { getCatalogItemBySlug } from "@/lib/repo/catalog";
import { listCoverMaterialVariants } from "@/lib/repo/cover-variants";
import { listBoxMaterialVariants } from "@/lib/repo/box-variants";
import { getClientPhoneFromSession, CLIENT_SESSION_COOKIE_NAME } from "@/lib/auth/client-session";
import { findClientByPhone } from "@/lib/repo/clients";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: PageProps<"/order/[slug]">) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const sessionPhone = getClientPhoneFromSession(
    cookieStore.get(CLIENT_SESSION_COOKIE_NAME)?.value,
  );

  const [item, coverMaterialVariants, boxMaterialVariants, loggedInClient] = await Promise.all([
    getCatalogItemBySlug(slug),
    listCoverMaterialVariants(),
    listBoxMaterialVariants(),
    // Already logged into /account (see client-session.ts)? Skip asking
    // for name/phone again on the order form — we already know who's
    // ordering. Falls back to the usual empty fields if the cookie is
    // missing/invalid or (edge case) the client row was since deleted.
    sessionPhone ? findClientByPhone(sessionPhone) : Promise.resolve(null),
  ]);
  if (!item || !item.isActive) notFound();
  if (item.productKind === "standard" && (!item.requiresUpload || item.formats.length === 0)) {
    notFound();
  }
  if (item.productKind === "wide_format" && item.wideFormatOptions.length === 0) notFound();

  const loggedInClientProp = loggedInClient
    ? { name: loggedInClient.fullName, phone: loggedInClient.phone }
    : null;

  return (
    <>
      <Header />
      {item.productKind === "wide_format" ? (
        <WideFormatConfigurator item={item} loggedInClient={loggedInClientProp} />
      ) : (
        <OrderConfigurator
          item={item}
          coverMaterialVariants={coverMaterialVariants}
          boxMaterialVariants={boxMaterialVariants}
          loggedInClient={loggedInClientProp}
        />
      )}
    </>
  );
}
