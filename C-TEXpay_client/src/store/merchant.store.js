import { create } from "zustand";
import merchantService from "../service/merchant.service";

export const useMerchantStore = create((set, get) => ({
  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  | `merchant`            → merchant the current user OWNS (or null)
  | `businessProfile`     → business profile of the OWNED merchant
  | `membership`          → the member record (owner OR team member)
  | `membershipMerchant`  → merchant from membership (READ-ONLY view)
  | `roles`               → roles assigned to the current user
  | `permissions`         → flattened permission keys from those roles
  */
  merchant: null,
  businessProfile: null,
  ownedMerchant: null,
  ownedBusinessProfile: null,

  membership: null,
  membershipMerchant: null,
  memberships: [],
  selectedMerchantId:
    typeof localStorage !== "undefined"
      ? localStorage.getItem("activeMerchantId")
      : null,

  roles: [],
  permissions: [],

  isLoading: false,
  error: null,

  /*
  |--------------------------------------------------------------------------
  | CREATE MERCHANT (owner-only action)
  |--------------------------------------------------------------------------
  */
  createMerchant: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await merchantService.createMerchant(payload);
      const merchant = res.data.merchant;
      if (merchant?.id) {
        localStorage.setItem("activeMerchantId", merchant.id);
      }
      set({
        ownedMerchant: merchant,
        ownedBusinessProfile: merchant?.businessProfile || null,
        selectedMerchantId: merchant?.id || null,
        merchant,
        businessProfile: merchant?.businessProfile || null,
        isLoading: false,
      });
      return { success: true, data: res };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to create merchant";
      set({ isLoading: false, error: message });
      return {
        success: false,
        message,
        status: err.response?.status,
        requiresEmailVerification:
          err.response?.status === 403 &&
          message === "Your account is not active",
      };
    }
  },

  /*
  |--------------------------------------------------------------------------
  | GET MY MERCHANT (owned)
  |--------------------------------------------------------------------------
  | 404 = user owns no merchant. Legitimate state — clear silently.
  */
  getMyMerchant: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await merchantService.getMyMerchant();
      const merchant = res.data.merchant;
      const selectedMerchantId = get().selectedMerchantId;
      set(() => ({
        ownedMerchant: merchant,
        ownedBusinessProfile: merchant?.businessProfile || null,
        ...(selectedMerchantId && selectedMerchantId !== merchant?.id
          ? {}
          : {
              merchant,
              businessProfile: merchant?.businessProfile || null,
            }),
        isLoading: false,
      }));
      return { success: true, data: res };
    } catch (err) {
      if (err.response?.status === 404) {
        set({
          ownedMerchant: null,
          ownedBusinessProfile: null,
          ...(get().selectedMerchantId
            ? {}
            : { merchant: null, businessProfile: null }),
          isLoading: false,
          error: null,
        });
        return { success: true, data: { data: { merchant: null } } };
      }
      const message =
        err.response?.data?.message || "Failed to load merchant";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  /*
  |--------------------------------------------------------------------------
  | UPDATE MERCHANT (owned)
  |--------------------------------------------------------------------------
  */
  updateMyMerchant: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await merchantService.updateMyMerchant(payload);
      set({ merchant: res.data.merchant, isLoading: false });
      return { success: true, data: res };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to update merchant";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  /*
  |--------------------------------------------------------------------------
  | GET BUSINESS PROFILE (owned)
  |--------------------------------------------------------------------------
  */
  getBusinessProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await merchantService.getBusinessProfile();
      set({
        businessProfile: res.data.businessProfile,
        isLoading: false,
      });
      return { success: true, data: res };
    } catch (err) {
      if (err.response?.status === 404) {
        set({ businessProfile: null, isLoading: false, error: null });
        return { success: true, data: { data: { businessProfile: null } } };
      }
      const message =
        err.response?.data?.message || "Failed to load business profile";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  getOwnedBusinessProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await merchantService.getOwnedBusinessProfile();
      set({
        ownedBusinessProfile: res.data.businessProfile,
        isLoading: false,
      });
      return { success: true, data: res };
    } catch (err) {
      if (err.response?.status === 404) {
        set({ ownedBusinessProfile: null, isLoading: false, error: null });
        return { success: true, data: { data: { businessProfile: null } } };
      }
      const message = err.response?.data?.message || "Failed to load your business profile";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  /*
  |--------------------------------------------------------------------------
  | UPDATE BUSINESS PROFILE (owned)
  |--------------------------------------------------------------------------
  */
  updateBusinessProfile: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await merchantService.updateBusinessProfile(payload);
      set({
        businessProfile: res.data.businessProfile,
        isLoading: false,
      });
      return { success: true, data: res };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to update business profile";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  /*
  |--------------------------------------------------------------------------
  | GET MY MEMBERSHIP (roles + permissions + merchant view)
  |--------------------------------------------------------------------------
  | Does NOT touch `merchant` or `businessProfile`.
  | Stores membership merchant separately as `membershipMerchant`.
  */
  getMyMembership: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await merchantService.getMyMembership();

      set({
        membership: res.data.membership,
        membershipMerchant: null,
        roles: res.data.roles || [],
        permissions: res.data.permissions || [],
        isLoading: false,
      });

      return { success: true, data: res };
    } catch (err) {
      if (err.response?.status === 404) {
        set({
          membership: null,
          membershipMerchant: null,
          roles: [],
          permissions: [],
          isLoading: false,
          error: null,
        });
        return { success: true, data: { data: {} } };
      }
      const message =
        err.response?.data?.message || "Failed to load membership";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  getMyMemberships: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await merchantService.getMyMemberships();
      const memberships = res.data.memberships || [];
      const currentSelection = get().selectedMerchantId;
      const selectedMembership = memberships.find(
        (membership) => membership.merchantId === currentSelection,
      );
      const ownedMembership = memberships.find((membership) => membership.isOwner);
      const nextSelection =
        selectedMembership?.merchantId ||
        ownedMembership?.merchantId ||
        memberships[0]?.merchantId ||
        null;

      if (nextSelection) localStorage.setItem("activeMerchantId", nextSelection);
      else localStorage.removeItem("activeMerchantId");

      set({
        memberships,
        selectedMerchantId: nextSelection,
        membership: null,
        membershipMerchant: null,
        roles: [],
        permissions: [],
        merchant: ownedMembership?.merchantId === nextSelection
          ? get().ownedMerchant
          : null,
        businessProfile: ownedMembership?.merchantId === nextSelection
          ? get().ownedBusinessProfile
          : null,
        isLoading: false,
      });

      if (nextSelection) await get().getMyMembership();
      return { success: true, data: res };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to load memberships";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  setActiveMerchant: (merchantId) => {
    const membership = get().memberships.find(
      (item) => item.merchantId === merchantId,
    );
    if (!membership) return false;

    localStorage.setItem("activeMerchantId", merchantId);
    set({
      selectedMerchantId: merchantId,
      membership: null,
      membershipMerchant: null,
      roles: [],
      permissions: [],
      merchant: membership.isOwner ? get().ownedMerchant : null,
      businessProfile: membership.isOwner ? get().ownedBusinessProfile : null,
      error: null,
    });
    return true;
  },

  /*
  |--------------------------------------------------------------------------
  | DERIVED HELPERS
  |--------------------------------------------------------------------------
  | Use these in components to avoid ambiguity.
  */

  /** True only if the current user OWNS a merchant. */
  isMerchantOwner: () => Boolean(get().ownedMerchant),

  /** True if the current user is a member (owner OR invited) of any merchant. */
  isTeamMember: () => get().memberships.length > 0,

  /** True if the user is a member but NOT the owner (invited only). */
  isInvitedOnly: () => get().memberships.some((item) => !item.isOwner) && !get().ownedMerchant,

  /** The merchant to display in a read-only context (prefers owned). */
  getDisplayMerchant: () => get().merchant,

  /** The business profile to display in a read-only context. */
  getDisplayBusinessProfile: () =>
    get().businessProfile,

  /*
  |--------------------------------------------------------------------------
  | RESET
  |--------------------------------------------------------------------------
  */
  clearMerchant: () => {
    localStorage.removeItem("activeMerchantId");
    set({
      merchant: null,
      businessProfile: null,
      ownedMerchant: null,
      ownedBusinessProfile: null,
      membership: null,
      membershipMerchant: null,
      memberships: [],
      selectedMerchantId: null,
      roles: [],
      permissions: [],
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));

export default useMerchantStore;