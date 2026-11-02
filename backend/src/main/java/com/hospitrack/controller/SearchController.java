package com.hospitrack.controller;

import com.hospitrack.dto.ApiResponse;
import com.hospitrack.dto.SearchResultDTO;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.SearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SearchResultDTO>>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String type,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String searchTerm = (q != null && !q.trim().isEmpty()) ? q : query;
        List<SearchResultDTO> results = searchService.search(searchTerm, type, principal);
        return ResponseEntity.ok(ApiResponse.success("Search results retrieved successfully.", results));
    }
}
