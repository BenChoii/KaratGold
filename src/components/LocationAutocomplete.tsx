import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Loader2, X } from 'lucide-react'
import './LocationAutocomplete.css'

interface LocationResult {
    id: string
    placeName: string
    latitude: number
    longitude: number
}

interface LocationAutocompleteProps {
    value: string
    onChange: (location: string, lat: number | null, lng: number | null) => void
    placeholder?: string
}

function LocationAutocomplete({ value, onChange, placeholder = 'Search for an address...' }: LocationAutocompleteProps) {
    const [query, setQuery] = useState(value)
    const [results, setResults] = useState<LocationResult[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState(!!value)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Sync external value changes
    useEffect(() => {
        if (value && !query) {
            setQuery(value)
            setSelected(true)
        }
    }, [value])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const searchLocations = useCallback(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.length < 3) {
            setResults([])
            return
        }

        setLoading(true)
        try {
            const encoded = encodeURIComponent(searchQuery)
            // Nominatim — OpenStreetMap's free geocoding API, no API key required
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=ca&limit=5&addressdetails=1`

            const res = await fetch(url, {
                headers: {
                    // Nominatim requires a valid User-Agent for their usage policy
                    'Accept': 'application/json',
                },
            })
            const data = await res.json()

            if (Array.isArray(data)) {
                setResults(data.map((item: any) => ({
                    id: String(item.place_id),
                    placeName: item.display_name,
                    latitude: parseFloat(item.lat),
                    longitude: parseFloat(item.lon),
                })))
                setIsOpen(true)
            }
        } catch (err) {
            console.error('Nominatim geocoding error:', err)
        }
        setLoading(false)
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setQuery(val)
        setSelected(false)
        onChange(val, null, null) // Clear lat/lng when typing

        // Debounce API calls (Nominatim usage policy: max 1 req/sec)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => searchLocations(val), 500)
    }

    const handleSelect = (result: LocationResult) => {
        setQuery(result.placeName)
        setSelected(true)
        setIsOpen(false)
        setResults([])
        onChange(result.placeName, result.latitude, result.longitude)
    }

    const handleClear = () => {
        setQuery('')
        setSelected(false)
        setResults([])
        onChange('', null, null)
    }

    return (
        <div className="location-autocomplete" ref={wrapperRef}>
            <div className="location-input-wrap">
                <MapPin size={16} className="location-input-icon" />
                <input
                    type="text"
                    className="input location-input"
                    placeholder={placeholder}
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                    autoComplete="off"
                />
                {loading && <Loader2 size={16} className="location-loading spinning" />}
                {selected && query && (
                    <button type="button" className="location-clear" onClick={handleClear}>
                        <X size={14} />
                    </button>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="location-dropdown">
                    {results.map(result => (
                        <button
                            key={result.id}
                            type="button"
                            className="location-option"
                            onClick={() => handleSelect(result)}
                        >
                            <MapPin size={14} className="location-option-icon" />
                            <span>{result.placeName}</span>
                        </button>
                    ))}
                    <div className="location-attribution">
                        Powered by OpenStreetMap Nominatim
                    </div>
                </div>
            )}
        </div>
    )
}

export default LocationAutocomplete
