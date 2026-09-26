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

@Service
@RequiredArgsConstructor
public class ActionHistoryService {

    private final ActionHistoryRepository actionHistoryRepository;

    /** Every filter is optional; {@code page} is 1-based. Newest actions first. */
    @Transactional(readOnly = true)
    public PageResponse<ActionHistoryResponse> search(String search, ActionStatus status, DeviceAction action,
                                                      DeviceType deviceType, Instant from, Instant to,
                                                      int page, int size) {
        Specification<ActionHistory> spec = Specification.unrestricted();
        if (StringUtils.hasText(search)) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("device").get("code")), pattern),
                    cb.like(cb.lower(root.get("device").get("name")), pattern)));
        }
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (action != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("action"), action));
        }
        if (deviceType != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("device").get("type"), deviceType));
        }
        if (from != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from));
        }
        if (to != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), to));
        }

        PageRequest pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.of(actionHistoryRepository.findAll(spec, pageable).map(ActionHistoryResponse::from));
    }
}
