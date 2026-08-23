import hallCenter from "../assets/panoramas/hall-center.jpg";
import kitchenCenter from "../assets/panoramas/kitchen-center.jpg";

/*
 * Core tour types
 */

export type ViewpointRole =
  | "CENTER"
  | "APPROACH"
  | "FEATURE"
  | "CUSTOM";

export type HotspotType =
  | "SPACE_NAVIGATION"
  | "VIEWPOINT_NAVIGATION"
  | "INFORMATION"
  | "RICH_CONTENT"
  | "EXTERNAL_REFERENCE";

export type ReviewStatus =
  | "NOT_REVIEWED"
  | "NEEDS_CORRECTION"
  | "REVIEWED";

export interface Viewpoint {
  id: string;
  spaceId: string;
  title: string;
  role: ViewpointRole;
  panorama: string;

  initialYaw: number;
  initialPitch: number;
  initialZoom: number;

  displayOrder: number;
  enabled: boolean;
}

export interface Space {
  id: string;
  title: string;
  type:
    | "EXTERIOR"
    | "ENTRANCE"
    | "HALL"
    | "KITCHEN"
    | "BEDROOM"
    | "BATHROOM"
    | "CORRIDOR"
    | "BALCONY"
    | "GARDEN"
    | "TERRACE"
    | "OTHER";

  displayOrder: number;
  enabled: boolean;
  viewpoints: Viewpoint[];
}

export interface Hotspot {
  id: string;

  sourceViewpointId: string;

  type: HotspotType;

  label: string;

  yaw: number;
  pitch: number;

  targetViewpointId?: string;

  title?: string;
  description?: string;
  imageUrl?: string;

  websiteLabel?: string;
  websiteUrl?: string;

  mapLabel?: string;
  mapUrl?: string;

  enabled: boolean;
  reviewStatus: ReviewStatus;
}

export interface TourData {
  schemaVersion: "1.0.0";

  id: string;
  title: string;

  startViewpointId: string;

  spaces: Space[];
  hotspots: Hotspot[];

  updatedAt: string;
}


export interface RichContent {
  id: string;

  title: string;

  description: string;

  gallery: string[];

  features: string[];

  brochureUrl?: string;

  websiteUrl?: string;

  mapsUrl?: string;

  createdAt: string;
}

/*
 * Initial demonstration tour
 */

export const initialTour: TourData = {
  schemaVersion: "1.0.0",

  id: "demo-property-tour",
  title: "Demo Property Tour",

  startViewpointId: "hall-center",

  spaces: [
    {
      id: "main-hall",
      title: "Main Hall",
      type: "HALL",
      displayOrder: 1,
      enabled: true,

      viewpoints: [
        {
          id: "hall-center",
          spaceId: "main-hall",
          title: "Main Hall Center",
          role: "CENTER",
          panorama: hallCenter,

          initialYaw: 0,
          initialPitch: 0,
          initialZoom: 35,

          displayOrder: 1,
          enabled: true,
        },
      ],
    },

    {
      id: "kitchen",
      title: "Kitchen",
      type: "KITCHEN",
      displayOrder: 2,
      enabled: true,

      viewpoints: [
        {
          id: "kitchen-center",
          spaceId: "kitchen",
          title: "Kitchen Center",
          role: "CENTER",
          panorama: kitchenCenter,

          initialYaw: 0,
          initialPitch: 0,
          initialZoom: 35,

          displayOrder: 1,
          enabled: true,
        },
      ],
    },
  ],

  hotspots: [],

  updatedAt: new Date().toISOString(),
};

/*
 * Lookup helpers
 */

export function getAllViewpoints(
  tour: TourData,
): Viewpoint[] {
  return tour.spaces.flatMap(
    (space) => space.viewpoints,
  );
}

export function getViewpoint(
  tour: TourData,
  viewpointId: string,
): Viewpoint | undefined {
  return getAllViewpoints(tour).find(
    (viewpoint) =>
      viewpoint.id === viewpointId,
  );
}

export function getSpace(
  tour: TourData,
  spaceId: string,
): Space | undefined {
  return tour.spaces.find(
    (space) => space.id === spaceId,
  );
}

export function getSpaceForViewpoint(
  tour: TourData,
  viewpointId: string,
): Space | undefined {
  return tour.spaces.find((space) =>
    space.viewpoints.some(
      (viewpoint) =>
        viewpoint.id === viewpointId,
    ),
  );
}

/*
 * Local persistence
 */

const TOUR_STORAGE_KEY =
  "virtual-property-tour-engine-draft";

export function saveTourDraft(
  tour: TourData,
): void {
  localStorage.setItem(
    TOUR_STORAGE_KEY,
    JSON.stringify(tour),
  );
}

export function loadTourDraft(): TourData {
  const storedTour =
    localStorage.getItem(TOUR_STORAGE_KEY);

  if (!storedTour) {
    return initialTour;
  }

  try {
    const parsedTour =
      JSON.parse(storedTour) as TourData;

    if (
      parsedTour.schemaVersion !== "1.0.0"
    ) {
      console.warn(
        "Unsupported stored tour version. Loading initial tour.",
      );

      return initialTour;
    }

    /*
     * Local Vite panorama imports can change
     * between development sessions.
     *
     * Restore the current panorama URLs from
     * initialTour while retaining saved data.
     */

    const currentPanoramas = new Map(
      getAllViewpoints(initialTour).map(
        (viewpoint) => [
          viewpoint.id,
          viewpoint.panorama,
        ],
      ),
    );

    const restoredSpaces =
      parsedTour.spaces.map((space) => ({
        ...space,

        viewpoints: space.viewpoints.map(
          (viewpoint) => ({
            ...viewpoint,

            panorama:
              currentPanoramas.get(
                viewpoint.id,
              ) ?? viewpoint.panorama,
          }),
        ),
      }));

    return {
      ...parsedTour,
      spaces: restoredSpaces,
    };
  } catch (error) {
    console.error(
      "Could not read saved tour:",
      error,
    );

    return initialTour;
  }
}

export function clearTourDraft(): void {
  localStorage.removeItem(
    TOUR_STORAGE_KEY,
  );
}

/*
 * Validation
 */

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

function isSecureUrl(
  value?: string,
): boolean {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateTour(
  tour: TourData,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const allViewpoints =
    getAllViewpoints(tour);

  const enabledViewpointIds = new Set(
    allViewpoints
      .filter(
        (viewpoint) => viewpoint.enabled,
      )
      .map((viewpoint) => viewpoint.id),
  );

  if (
    !enabledViewpointIds.has(
      tour.startViewpointId,
    )
  ) {
    errors.push(
      "The starting viewpoint does not exist or is disabled.",
    );
  }

  tour.spaces
    .filter((space) => space.enabled)
    .forEach((space) => {
      const centers =
        space.viewpoints.filter(
          (viewpoint) =>
            viewpoint.enabled &&
            viewpoint.role === "CENTER",
        );

      if (centers.length === 0) {
        errors.push(
          `${space.title} has no Center viewpoint.`,
        );
      }

      if (centers.length > 1) {
        errors.push(
          `${space.title} has more than one Center viewpoint.`,
        );
      }
    });

  tour.hotspots
    .filter((hotspot) => hotspot.enabled)
    .forEach((hotspot) => {
      if (
        !enabledViewpointIds.has(
          hotspot.sourceViewpointId,
        )
      ) {
        errors.push(
          `Hotspot "${hotspot.label}" has an invalid source viewpoint.`,
        );
      }

      const navigationTypes:
        HotspotType[] = [
          "SPACE_NAVIGATION",
          "VIEWPOINT_NAVIGATION",
        ];

      if (
        navigationTypes.includes(
          hotspot.type,
        )
      ) {
        if (!hotspot.targetViewpointId) {
          errors.push(
            `Navigation hotspot "${hotspot.label}" has no destination.`,
          );
        } else if (
          !enabledViewpointIds.has(
            hotspot.targetViewpointId,
          )
        ) {
          errors.push(
            `Navigation hotspot "${hotspot.label}" points to a missing destination.`,
          );
        }
      }

      if (
        !isSecureUrl(hotspot.websiteUrl)
      ) {
        errors.push(
          `"${hotspot.label}" has an invalid website URL. Use HTTPS.`,
        );
      }

      if (!isSecureUrl(hotspot.mapUrl)) {
        errors.push(
          `"${hotspot.label}" has an invalid map URL. Use HTTPS.`,
        );
      }

      if (
        hotspot.type === "RICH_CONTENT" &&
        !hotspot.title
      ) {
        warnings.push(
          `Rich-content hotspot "${hotspot.label}" has no card title.`,
        );
      }
    });

  allViewpoints
    .filter(
      (viewpoint) =>
        viewpoint.enabled &&
        viewpoint.id !==
          tour.startViewpointId,
    )
    .forEach((viewpoint) => {
      const hasIncomingConnection =
        tour.hotspots.some(
          (hotspot) =>
            hotspot.enabled &&
            hotspot.targetViewpointId ===
              viewpoint.id,
        );

      if (!hasIncomingConnection) {
        warnings.push(
          `${viewpoint.title} has no incoming navigation hotspot.`,
        );
      }
    });

  return {
    errors,
    warnings,
  };
}