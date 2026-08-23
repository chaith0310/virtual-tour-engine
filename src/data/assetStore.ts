import {
  del,
  get,
  set,
} from "idb-keyval";

const OBJECT_URL_CACHE =
  new Map<string, string>();

export type StoredPanoramaAsset = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  blob: Blob;
};

export function createAssetReference(
  assetId: string,
): string {
  return `indexeddb://${assetId}`;
}

export function isIndexedDbAsset(
  panorama: string,
): boolean {
  return panorama.startsWith(
    "indexeddb://",
  );
}

export function getAssetIdFromReference(
  panorama: string,
): string {
  return panorama.replace(
    "indexeddb://",
    "",
  );
}

export async function savePanoramaAsset(
  file: File,
): Promise<string> {
  const assetId =
    crypto.randomUUID();

  const asset: StoredPanoramaAsset = {
    id: assetId,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    createdAt:
      new Date().toISOString(),
    blob: file,
  };

  await set(
    `panorama:${assetId}`,
    asset,
  );

  return createAssetReference(
    assetId,
  );
}

export async function getPanoramaAsset(
  assetId: string,
): Promise<
  StoredPanoramaAsset | undefined
> {
  return get<StoredPanoramaAsset>(
    `panorama:${assetId}`,
  );
}

export async function resolvePanoramaUrl(
  panorama: string,
): Promise<string> {
  if (!isIndexedDbAsset(panorama)) {
    return panorama;
  }

  const assetId =
    getAssetIdFromReference(
      panorama,
    );

  const existingUrl =
    OBJECT_URL_CACHE.get(assetId);

  if (existingUrl) {
    return existingUrl;
  }

  const asset =
    await getPanoramaAsset(
      assetId,
    );

  if (!asset) {
    throw new Error(
      `Panorama asset ${assetId} was not found.`,
    );
  }

  const objectUrl =
    URL.createObjectURL(
      asset.blob,
    );

  OBJECT_URL_CACHE.set(
    assetId,
    objectUrl,
  );

  return objectUrl;
}

export async function deletePanoramaAsset(
  panorama: string,
): Promise<void> {
  if (!isIndexedDbAsset(panorama)) {
    return;
  }

  const assetId =
    getAssetIdFromReference(
      panorama,
    );

  const cachedUrl =
    OBJECT_URL_CACHE.get(assetId);

  if (cachedUrl) {
    URL.revokeObjectURL(
      cachedUrl,
    );

    OBJECT_URL_CACHE.delete(
      assetId,
    );
  }

  await del(
    `panorama:${assetId}`,
  );
}

export function clearPanoramaObjectUrls(): void {
  OBJECT_URL_CACHE.forEach(
    (url) => {
      URL.revokeObjectURL(url);
    },
  );

  OBJECT_URL_CACHE.clear();
}