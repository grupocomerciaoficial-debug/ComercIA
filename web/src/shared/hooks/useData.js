import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../app/providers.jsx';
import {
  adminRepo,
  businessRepo,
  catalogRepo,
  guideRepo,
  inboxRepo,
  ordersRepo,
} from '../data/repositories.js';
import { ORDER_POLL_MS, PAGE_SIZE } from '../lib/contracts.js';

const commerceKey = (user) => user?.comercio_id || null;

export function useOrders(params = {}) {
  const { user } = useAuth();
  const commerceId = commerceKey(user);
  return useQuery({
    queryKey: ['orders', commerceId, params],
    queryFn: () => ordersRepo.listOrders({ ...params, commerceId }),
    enabled: Boolean(user && user.role === 'dueno' && commerceId),
    placeholderData: (previous) => previous,
    refetchInterval: ORDER_POLL_MS,
    refetchIntervalInBackground: false,
  });
}

export function useOrder(id) {
  const { user } = useAuth();
  const commerceId = commerceKey(user);
  return useQuery({
    queryKey: ['order', commerceId, id],
    queryFn: () => ordersRepo.getOrder(id, { commerceId }),
    enabled: Boolean(id && user && user.role === 'dueno' && commerceId),
  });
}

export function useOrderMetrics() {
  const { user } = useAuth();
  const commerceId = commerceKey(user);
  return useQuery({
    queryKey: ['orderMetrics', commerceId],
    queryFn: () => ordersRepo.orderMetrics({ commerceId }),
    enabled: Boolean(user && user.role === 'dueno' && commerceId),
    refetchInterval: ORDER_POLL_MS,
  });
}

export function useProducts(params = {}) {
  const { user } = useAuth();
  const commerceId = commerceKey(user);
  return useQuery({
    queryKey: ['products', commerceId, params],
    queryFn: () => catalogRepo.listProducts({ ...params, commerceId }),
    enabled: Boolean(user && user.role === 'dueno' && commerceId),
  });
}

export function usePendingAlerts({ enabled = true } = {}) {
  const { user } = useAuth();
  const commerceId = commerceKey(user);
  return useQuery({
    queryKey: ['alertCount', commerceId],
    queryFn: () => inboxRepo.countAlerts({ commerceId }),
    enabled: Boolean(user && user.role === 'dueno' && commerceId && enabled),
    refetchInterval: ORDER_POLL_MS,
    refetchIntervalInBackground: false,
  });
}

export function useAlerts() {
  const { user } = useAuth();
  const commerceId = commerceKey(user);
  return useQuery({
    queryKey: ['alerts', commerceId],
    queryFn: () => inboxRepo.listAlerts({ commerceId }),
    enabled: Boolean(user && user.role === 'dueno' && commerceId),
    refetchInterval: 4000,
    refetchIntervalInBackground: false,
  });
}

export function useBusiness() {
  const { user } = useAuth();
  const commerceId = commerceKey(user);
  return useQuery({
    queryKey: ['business', commerceId],
    queryFn: () => businessRepo.getBusiness({ commerceId }),
    enabled: Boolean(user && user.role === 'dueno' && commerceId),
  });
}

export function useGuide() {
  const { user } = useAuth();
  const commerceId = commerceKey(user);
  return useQuery({
    queryKey: ['guide', commerceId],
    queryFn: () => guideRepo.getGuide({ commerceId }),
    enabled: Boolean(user && user.role === 'dueno' && commerceId),
  });
}

export function useMerchants() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['merchants'],
    queryFn: () => adminRepo.listMerchants(),
    enabled: Boolean(user && user.role === 'admin'),
  });
}

export function useOrderAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const commerceId = commerceKey(user);
  return useMutation({
    mutationFn: ({ id, status, reason }) => ordersRepo.transitionOrder(id, status, reason),
    onSuccess: async (_, values) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['order', commerceId, values.id] }),
        queryClient.invalidateQueries({ queryKey: ['orderMetrics'] }),
      ]),
  });
}

export function useProductAction(action) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const commerceId = commerceKey(user);
  return useMutation({
    mutationFn: (values) => {
      if (action === 'save')
        return catalogRepo.saveProduct(values.data, { commerceId, id: values.id });
      if (action === 'availability')
        return catalogRepo.setProductAvailability(values.id, values.value, { commerceId });
      return catalogRepo.softDeleteProduct(values.id, { commerceId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', commerceId] }),
  });
}

export function useBusinessAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const commerceId = commerceKey(user);
  return useMutation({
    mutationFn: (value) => businessRepo.saveBusiness(value, { commerceId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business', commerceId] }),
  });
}

export function useGuideAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const commerceId = commerceKey(user);
  return useMutation({
    mutationFn: (value) => guideRepo.saveGuide(value, { commerceId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guide', commerceId] }),
  });
}

export function useAlertAction(action) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const commerceId = commerceKey(user);
  return useMutation({
    mutationFn: (values) =>
      action === 'resolve'
        ? inboxRepo.resolveAlert(values.id, values)
        : inboxRepo.decideRequest(values.solicitudId, values.decision),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['alerts', commerceId] }),
        queryClient.invalidateQueries({ queryKey: ['alertCount', commerceId] }),
      ]),
  });
}

export function useMessageAction() {
  const queryClient = useQueryClient();
  const { user, session } = useAuth();
  const commerceId = commerceKey(user);
  return useMutation({
    mutationFn: ({ id, text }) => inboxRepo.sendOwnerMessage(id, text, session),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['alerts', commerceId] }),
        queryClient.invalidateQueries({ queryKey: ['alertCount', commerceId] }),
      ]),
  });
}

export function useMerchantAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }) => adminRepo.toggleMerchant(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchants'] }),
  });
}

export function usePhoneIdAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }) => adminRepo.savePhoneId(id, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchants'] }),
  });
}

export { PAGE_SIZE };
