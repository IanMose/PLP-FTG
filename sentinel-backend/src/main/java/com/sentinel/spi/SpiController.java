package com.sentinel.spi;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class SpiController {

    private final SpiService spiService;

    @GetMapping("/spi")
    public ResponseEntity<SpiSummaryDto> getSpi() {
        return ResponseEntity.ok(spiService.getSummary());
    }
}
