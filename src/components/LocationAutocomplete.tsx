import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Loader2, X } from 'lucide-react'
import './LocationAutocomplete.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

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
        if (!searchQuery || searchQuery.length < 3 || !MAPBOX_TOKEN) {
            setResults([])
            return
        }

        setLoading(true)
        try {
            const encoded = encodeURIComponent(searchQuery)
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&country=ca&types=address,poi,place,locality,neighborhood&limit=5&proximity=-119.4960,49.8880`

            const res = await fetch(url)
            const data = await res.json()

            if (data.features) {
                setResults(data.features.map((f: any) => ({
                    id: f.id,
                    placeName: f.place_name,
                    latitude: f.center[1],
                    longitude: f.center[0],
                })))
                setIsOpen(true)
            }
        } catch (err) {
            console.error('Mapbox geocoding error:', err)
        }
        setLoading(false)
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setQuery(val)
        setSelected(false)
        onChange(val, null, null) // Clear lat/lng when typing

        // Debounce API calls
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => searchLocations(val), 300)
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
                        Powered by Mapbox
                    </div>
                </div>
            )}
        </div>
    )
}

export default LocationAutocomplete
