<?php

declare(strict_types=1);

namespace App\Domain\Healthcare;

use App\Enums\DispatchTargetSource;
use App\Models\EmergencyEvent;
use App\Models\Shelter;
use Illuminate\Validation\ValidationException;

final class DispatchTargetSnapshot
{
    public function resolve(EmergencyEvent $emergency, array $request): array
    {
        $coordinates = $this->coordinates($emergency->latitude, $emergency->longitude);
        $shelter = $emergency->shelter_id
            ? Shelter::whereKey($emergency->shelter_id)->lockForUpdate()->first()
            : null;
        $source = $request['target_source'] ?? match (true) {
            $coordinates !== null => DispatchTargetSource::GPS->value,
            $shelter !== null => DispatchTargetSource::SHELTER->value,
            default => DispatchTargetSource::MANUAL->value,
        };

        $target = [
            'target_source' => $source,
            'target_latitude' => null,
            'target_longitude' => null,
            'target_shelter_id' => null,
            'target_description' => null,
        ];

        if ($source === DispatchTargetSource::GPS->value) {
            if (! $coordinates) {
                throw ValidationException::withMessages(['target_source' => 'Koordinat GPS darurat yang valid belum tersedia.']);
            }
            [$target['target_latitude'], $target['target_longitude']] = $coordinates;
        } elseif ($source === DispatchTargetSource::SHELTER->value) {
            if (! $shelter) {
                throw ValidationException::withMessages(['target_source' => 'Posko pada kejadian darurat belum tersedia.']);
            }
            $location = Shelter::whereKey($shelter->id)
                ->selectRaw('ST_Y(location) as latitude, ST_X(location) as longitude')->first();
            $position = $this->coordinates($location->latitude, $location->longitude);
            $target['target_shelter_id'] = $shelter->id;
            $target['target_description'] = trim(implode(' — ', array_filter([$shelter->name, $shelter->address])));
            if ($position) {
                [$target['target_latitude'], $target['target_longitude']] = $position;
            }
            if (! $position && $target['target_description'] === '') {
                throw ValidationException::withMessages(['target_source' => 'Lokasi Posko belum cukup untuk penugasan.']);
            }
        } else {
            if ($request['target_description'] === null) {
                throw ValidationException::withMessages(['target_description' => 'Isi deskripsi lokasi tujuan respons.']);
            }
            $target['target_description'] = $request['target_description'];
        }

        return $target;
    }

    /** @return array{string, string}|null */
    private function coordinates(mixed $latitude, mixed $longitude): ?array
    {
        if (! is_numeric($latitude) || ! is_numeric($longitude)) {
            return null;
        }
        $lat = (float) $latitude;
        $lng = (float) $longitude;
        if (! is_finite($lat) || ! is_finite($lng) || abs($lat) > 90 || abs($lng) > 180) {
            return null;
        }

        return [number_format($lat, 8, '.', ''), number_format($lng, 8, '.', '')];
    }
}
