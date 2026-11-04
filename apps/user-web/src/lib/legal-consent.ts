interface ConsentDocument {
    id: string;
    required: boolean;
}

export function hasRequiredConsent(documents: ConsentDocument[], checked: Record<string, boolean>) {
    return documents.filter((document) => document.required).every((document) => checked[document.id]);
}

export function selectedTermsIds(documents: ConsentDocument[], checked: Record<string, boolean>) {
    return documents.filter((document) => checked[document.id]).map((document) => document.id);
}