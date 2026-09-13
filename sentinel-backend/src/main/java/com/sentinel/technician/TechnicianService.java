package com.sentinel.technician;

import com.sentinel.user.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TechnicianService {

    private final TechnicianRepository techRepo;
    private final TechnicianQualificationRepository qualRepo;
    private final AppUserRepository userRepo;

    public List<TechnicianDto> listAll() {
        return techRepo.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<TechnicianDto> listEligible(String qualificationType) {
        return techRepo.findAll().stream()
                .filter(t -> qualRepo.existsValidQualification(
                        t.getAppUserId(), qualificationType, LocalDate.now()))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private TechnicianDto toDto(TechnicianEntity t) {
        String name = userRepo.findById(t.getAppUserId()).map(u -> u.getName()).orElse("Unknown");
        String email = userRepo.findById(t.getAppUserId()).map(u -> u.getEmail()).orElse("");
        List<String> quals = qualRepo.findQualificationTypesByTechnicianId(t.getId());
        return TechnicianDto.builder()
                .id(t.getId()).appUserId(t.getAppUserId())
                .name(name).email(email)
                .stationHomeId(t.getStationHomeId())
                .qualifications(quals).build();
    }
}
