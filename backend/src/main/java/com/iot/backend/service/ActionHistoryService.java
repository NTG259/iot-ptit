package com.iot.backend.service;

import com.iot.backend.dto.ActionHistoryResponse;
import com.iot.backend.dto.PageResponse;
import com.iot.backend.entity.ActionHistory;
import com.iot.backend.entity.enums.ActionStatus;
import com.iot.backend.entity.enums.DeviceAction;
import com.iot.backend.entity.enums.DeviceType;
import com.iot.backend.repository.ActionHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ActionHistoryService {

    private final ActionHistoryRepository actionHistoryRepository;

    /**
     * Every filter is optional (an empty list means any); {@code page} is 1-based. Newest actions first by default.
     * {@code search} is matched against the field {@code searchBy} names (time, type or name; see {@link TimeSearch}); when null, a time if it reads as one, else a device code/name.
     */
    @Transactional(readOnly = true)
    public PageResponse<ActionHistoryResponse> search(String search, SearchBy searchBy, List<ActionStatus> status, List<DeviceAction> action,
                                                      List<DeviceType> deviceType, Instant from, Instant to,
                                                      boolean newestFirst, int page, int size) {
        Specification<ActionHistory> spec = Specification.unrestricted();
        if (StringUtils.hasText(search)) {
            spec = spec.and(matching(search.trim(), searchBy));
        }
        if (status != null && !status.isEmpty()) {
            spec = spec.and((root, query, cb) -> root.get("status").in(status));
        }
        if (action != null && !action.isEmpty()) {
            spec = spec.and((root, query, cb) -> root.get("action").in(action));
        }
        if (deviceType != null && !deviceType.isEmpty()) {
            spec = spec.and((root, query, cb) -> root.get("device").get("type").in(deviceType));
        }
        if (from != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from));
        }
        if (to != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), to));
        }

        // "All On"/"All Off" create several rows in the same instant, so the id keeps that order stable.
        Sort.Direction direction = newestFirst ? Sort.Direction.DESC : Sort.Direction.ASC;
        PageRequest pageable = PageRequest.of(page - 1, size, Sort.by(direction, "createdAt", "id"));
        return PageResponse.of(actionHistoryRepository.findAll(spec, pageable).map(ActionHistoryResponse::from));
    }

    /** Matches {@code search} against the chosen field; with no field, a time if it reads as one, else the device. */
    private static Specification<ActionHistory> matching(String search, SearchBy searchBy) {
        Specification<ActionHistory> time = TimeSearch.matching(search, "createdAt", "secondOfDay");
        if (searchBy == null) {
            return time != null ? time : name(search);
        }
        return switch (searchBy) {
            case TIME -> time != null ? time : (root, query, cb) -> cb.disjunction();
            case TYPE -> {
                String pattern = "%" + search.toLowerCase().replace(' ', '_') + "%";
                yield (root, query, cb) -> cb.like(cb.lower(root.get("device").get("type").as(String.class)), pattern);
            }
            case NAME, VALUE -> name(search);
        };
    }

    private static Specification<ActionHistory> name(String search) {
        String pattern = "%" + search.toLowerCase() + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("device").get("code")), pattern),
                cb.like(cb.lower(root.get("device").get("name")), pattern));
    }
}
