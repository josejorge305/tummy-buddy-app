import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Pressable,
  Animated,
  Easing,
  Dimensions,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import BrandTitle from '../../components/BrandTitle';
import {
  fetchPlaceSuggestions,
  fetchPlaceDetails,
  PlaceSuggestion,
} from '../../api/places';
import { API_BASE_URL } from '../../api/api';
import { useMenuPrefetch } from '../../context/MenuPrefetchContext';

async function fetchEta(origin: any, destination: any, apiKey: string | undefined) {
  if (!origin || !destination) return null;

  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial` +
    `&origins=${origin.lat},${origin.lng}` +
    `&destinations=${destination.lat},${destination.lng}` +
    `&mode=driving` +
    `&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const driving = data?.rows?.[0]?.elements?.[0]?.duration?.text;

    // Optional walking ETA
    const walkUrl = url.replace("mode=driving", "mode=walking");
    const walkRes = await fetch(walkUrl);
    const walkData = await walkRes.json();
    const walking = walkData?.rows?.[0]?.elements?.[0]?.duration?.text;

    return { driving, walking };
  } catch {
    return null;
  }
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in km
}

type SearchMode = 'restaurant' | 'dish' | 'photo';

const DUMMY_DISH = {
  id: 'dish-1',
  name: 'Mediterranean Salmon Bowl',
  barometer: 76,
  allergens: ['Fish', 'Onion', 'Garlic'],
};

export default function HomeScreen() {
  const router = useRouter();
  const { prefetchMenu, getPrefetchStatus } = useMenuPrefetch();
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('restaurant');

  const [placeResults, setPlaceResults] = useState<PlaceSuggestion[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<
    (PlaceSuggestion & { lat?: number; lng?: number }) | null
  >(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<any | null>(null);
  const [nearbyRestaurants, setNearbyRestaurants] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedRestaurantIndex, setSelectedRestaurantIndex] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;
  const restaurantListRef = useRef<FlatList<any> | null>(null);
  const [isPlacesLoading, setIsPlacesLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [etaCache, setEtaCache] = useState<
    Record<string, { driving?: string; walking?: string } | null>
  >({});

  const handleSearchSubmit = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (searchMode !== 'restaurant') {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const lat = selectedPlace?.lat ?? userCoords?.lat ?? 0;
      const lng = selectedPlace?.lng ?? userCoords?.lng ?? 0;

      const res = await fetch(
        `${API_BASE_URL}/restaurants/find?query=${encodeURIComponent(trimmed)}&lat=${lat}&lng=${lng}`
      );

      if (!res.ok) {
        throw new Error(`Search failed: ${res.status}`);
      }

      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];

      if (items.length === 0) {
        setSearchResults([]);
        setError('No restaurants found for that search.');
        return;
      }

      // Only suggestions change here
      setSearchResults(items);

      // Do not modify nearbyRestaurants or selection here
    } catch (err) {
      console.error('handleSearchSubmit error', err);
      setError('Could not search restaurants right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchResultSelect = async (index: number) => {
    if (!searchResults || searchResults.length === 0) return;
    if (index < 0 || index >= searchResults.length) return;

    const selected = searchResults[index];

    if (selected.name) {
      setQuery(selected.name);
    }

    setSearchResults([]);

    const lat = selected.lat;
    const lng = selected.lng;

    try {
      setIsLoading(true);
      setError(null);

      // Center map immediately on selected
      setMapRegion((prev: any) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
      }));

      // Load ALL restaurants near that location
      const params = new URLSearchParams();
      params.set('lat', String(lat));
      params.set('lng', String(lng));
      params.set('radius', '1500');

      const res = await fetch(`${API_BASE_URL}/restaurants/find?${params.toString()}`);

      if (!res.ok) {
        throw new Error(`Nearby search failed: ${res.status}`);
      }

      const data = await res.json();
      let items = Array.isArray(data.items) ? data.items : [];

      let activeIndex = items.findIndex((r: any) => {
        const samePlaceId =
          selected.placeId && r.placeId && r.placeId === selected.placeId;
        const sameId = selected.id && r.id && r.id === selected.id;
        const sameName =
          selected.name &&
          r.name &&
          selected.name.toLowerCase() === r.name.toLowerCase();
        const sameAddress =
          selected.address &&
          r.address &&
          selected.address.toLowerCase() === r.address.toLowerCase();
        return samePlaceId || sameId || (sameName && sameAddress);
      });

      if (activeIndex < 0) {
        items = [selected, ...items];
        activeIndex = 0;
      }

      setNearbyRestaurants(items);
      setSelectedRestaurantIndex(activeIndex);
      setSelectedPlace({
        description: items[activeIndex].name,
        placeId: items[activeIndex].placeId,
        lat: items[activeIndex].lat,
        lng: items[activeIndex].lng,
      });

      // Start background prefetching for menu
      const active = items[activeIndex];
      if (active?.placeId && active?.name && active?.address) {
        prefetchMenu(active.placeId, active.name, active.address);
      }

      const activeLat = active?.lat ?? lat;
      const activeLng = active?.lng ?? lng;

      if (typeof activeLat === 'number' && typeof activeLng === 'number') {
        setMapRegion((prev: any) => ({
          ...prev,
          latitude: activeLat,
          longitude: activeLng,
        }));
      }

      try {
        restaurantListRef?.current?.scrollToIndex({
          index: activeIndex,
          animated: true,
        });
      } catch (e) {
        console.warn('scrollToIndex failed', e);
      }
    } catch (err) {
      console.error('handleSearchResultSelect error', err);
      setError('Could not load restaurants near that location.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlace = async (place: PlaceSuggestion) => {
    setPlaceResults([]);
    setQuery(place.description);

    try {
      const details = await fetchPlaceDetails(place.placeId);
      const placeLat = details.lat;
      const placeLng = details.lng;

      const next = {
        description: place.description,
        placeId: place.placeId,
        lat: placeLat,
        lng: placeLng,
      };

      setSelectedPlace(next);

      await loadRestaurantsAround(placeLat, placeLng);
    } catch (e) {
      console.error('Failed to load place details:', e);
      setSelectedPlace({ description: place.description, placeId: place.placeId });
    }
  };

  const openRestaurant = () => {
    if (selectedPlace) {
      const address =
        (selectedPlace as any).address ||
        (selectedPlace as any).formatted_address ||
        selectedPlace.description ||
        '';

      const lat =
        (selectedPlace as any).lat ??
        (selectedPlace as any).latitude ??
        (selectedPlace as any).location?.lat ??
        (selectedPlace as any).geometry?.location?.lat;

      const lng =
        (selectedPlace as any).lng ??
        (selectedPlace as any).longitude ??
        (selectedPlace as any).location?.lng ??
        (selectedPlace as any).geometry?.location?.lng;

      router.push({
        pathname: '/restaurant',
        params: {
          placeId: selectedPlace.placeId,
          restaurantName: selectedPlace.description,
          address,
          ...(lat != null ? { lat: String(lat) } : {}),
          ...(lng != null ? { lng: String(lng) } : {}),
        },
      });
    } else {
      router.push('/restaurant');
    }
  };

  const openDish = () => {
    console.log('Dish screen is deprecated; likely recipe view coming soon.');
  };

  const setMode = (mode: SearchMode) => {
    setSearchMode(mode);
    setPlaceResults([]);
    setError(null);
  };

  const toggleFiltersExpanded = () => {
    setFiltersExpanded((prev) => !prev);
  };

  const handleCameraPress = () => {
    // TODO: hook up camera flow later
    console.log('Camera pressed');
  };

  const loadRestaurantsAround = async (lat: number, lng: number) => {
    console.log("LOAD AROUND START:", lat, lng);
    try {
      const url = `${API_BASE_URL}/restaurants/find?query=restaurant&lat=${lat}&lng=${lng}&radius=1500`;
      const res = await fetch(url);
      const data = await res.json();

      console.log("LOAD AROUND RAW RESPONSE:", JSON.stringify(data).slice(0,300));
      console.log("LOAD AROUND ITEMS COUNT:", data?.items?.length);

      const items = Array.isArray(data?.items) ? data.items : [];
      const sorted = [...items].sort((a, b) => {
        if (!userCoords) return 0;
        const da = haversineDistance(userCoords.lat, userCoords.lng, a.lat, a.lng);
        const db = haversineDistance(userCoords.lat, userCoords.lng, b.lat, b.lng);
        return da - db; // ascending (closest first)
      });
      setNearbyRestaurants(sorted);
      setSelectedRestaurantIndex(0);

      if (userCoords) {
        for (const r of sorted) {
          const key = `${r.lat},${r.lng}`;
          if (!etaCache[key]) {
            const eta = await fetchEta(
              userCoords,
              { lat: r.lat, lng: r.lng },
              process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY
            );
            setEtaCache((prev) => ({ ...prev, [key]: eta }));
          }
        }
      }

      if (items.length > 0) {
        const first = items[0];
        setMapRegion({
          latitude: first.lat,
          longitude: first.lng,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });

        if (setSelectedPlace) {
          setSelectedPlace({
            description: first.name,
            placeId: first.placeId,
            lat: first.lat,
            lng: first.lng,
          });
        }
      }
    } catch (err) {
      console.log('loadRestaurantsAround error:', err);
      setNearbyRestaurants([]);
      setSelectedRestaurantIndex(0);
    }
  };

  const getUserLocation = async () => {
    try {
      // Request permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // fallback: use a default Miami location
        const defaultLat = 25.7617;
        const defaultLng = -80.1918;
        setUserCoords({ lat: defaultLat, lng: defaultLng });
        setMapRegion({
          latitude: defaultLat,
          longitude: defaultLng,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
        await loadRestaurantsAround(defaultLat, defaultLng);
        return;
      }

      // Get coordinates
      let loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;

      setUserCoords({ lat: latitude, lng: longitude });

      // Set map region
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      });

      await loadRestaurantsAround(latitude, longitude);
    } catch (err) {
      console.log('Location error:', err);
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.4,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulse]);

  const selectedRestaurant =
    nearbyRestaurants.length > 0
      ? nearbyRestaurants[Math.max(0, Math.min(selectedRestaurantIndex, nearbyRestaurants.length - 1))]
      : null;

  const previewRestaurantName =
    selectedPlace?.description || selectedRestaurant?.name || '';

  console.log("nearbyRestaurants:", nearbyRestaurants.length);

  useEffect(() => {
    if (!selectedRestaurant) return;

    if (
      typeof selectedRestaurant.lat !== 'number' ||
      typeof selectedRestaurant.lng !== 'number'
    ) {
      return;
    }

    setMapRegion({
      latitude: selectedRestaurant.lat,
      longitude: selectedRestaurant.lng,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    });
  }, [selectedRestaurant]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.navBar}>
          <View style={styles.navLeft}>
            <BrandTitle style={styles.brandTitle} />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        <View style={styles.mainBody}>
          <View style={styles.brandTaglineBlock}>
            <Text style={styles.brandTaglineText}>Smart restaurant & gut insights</Text>
          </View>

          {/* Search + mode row */}
          <View style={styles.searchRow}>
            <View style={styles.searchWrapper}>
              <Ionicons
                name="search-outline"
                size={18}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for restaurants or dishes"
                placeholderTextColor="#b3b8c4"
                value={query}
                onChangeText={(text) => {
              setQuery(text);
              setError(null);
            }}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
          />
            </View>

            {/* Mode toggle */}
            <View style={styles.modeRow}>
              <View style={styles.modeToggle}>
                <Pressable
                  onPress={() => setMode('restaurant')}
                  style={[
                    styles.modeSegment,
                    searchMode === 'restaurant' && styles.modeSegmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeSegmentText,
                      searchMode === 'restaurant' && styles.modeSegmentTextActive,
                    ]}
                  >
                    Restaurants
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('dish')}
                  style={[
                    styles.modeSegment,
                    searchMode === 'dish' && styles.modeSegmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeSegmentText,
                      searchMode === 'dish' && styles.modeSegmentTextActive,
                    ]}
                  >
                    Dishes
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('photo')}
                  style={[
                    styles.modeSegment,
                    searchMode === 'photo' && styles.modeSegmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeSegmentText,
                      searchMode === 'photo' && styles.modeSegmentTextActive,
                    ]}
                  >
                    Photo
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              {searchResults.map((item: any, index: number) => (
                <TouchableOpacity
                  key={item.placeId || item.id || item.name}
                  onPress={() => handleSearchResultSelect(index)}
                  style={styles.searchResultItem}
                >
                  <Text style={styles.searchResultName}>{item.name}</Text>
                  {item.address ? (
                    <Text style={styles.searchResultAddress}>{item.address}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}

        {/* Places suggestions (Restaurant mode) */}
        {searchMode === 'restaurant' && (
          <>
            {isPlacesLoading && (
              <Text style={styles.helperText}>Searching places…</Text>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
            {placeResults.length > 0 && (
              <View style={styles.placesList}>
                {placeResults.map((place) => (
                  <TouchableOpacity
                    key={place.placeId}
                    style={styles.placeRow}
                    onPress={() => handleSelectPlace(place)}
                  >
                    <Text style={styles.placeDescription}>
                      {place.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* Premium CTA row – navigates to Profile */}
        <Pressable onPress={() => router.push('/profile')} style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
          <Text style={styles.upgradeSubtitle}>
            Unlock detailed organ analytics & meal history.
          </Text>
        </Pressable>

        {/* Nearby restaurants header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby restaurants</Text>
        </View>

        {/* Map */}
        <View style={styles.section}>
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={mapRegion}
              showsUserLocation={true}
              showsMyLocationButton={false}
            >
              {userCoords && (
                <Marker
                  coordinate={{
                    latitude: userCoords.lat,
                    longitude: userCoords.lng,
                  }}
                  pinColor="#ffffff"
                  title="You are here"
                />
              )}

              {nearbyRestaurants.map((r, index) => {
                const isSelected = index === selectedRestaurantIndex;

                return (
                  <Marker
                    key={r.placeId || String(index)}
                    coordinate={{
                      latitude: r.lat,
                      longitude: r.lng,
                    }}
                    onPress={() => {
                      setSelectedRestaurantIndex(index);
                      setSelectedPlace({
                        description: r.name,
                        placeId: r.placeId,
                        lat: r.lat,
                        lng: r.lng,
                      });
                      // Start background prefetching for menu
                      if (r.placeId && r.name && r.address) {
                        prefetchMenu(r.placeId, r.name, r.address);
                      }
                    }}
                  >
                    <View style={styles.pinContainer}>
                      {isSelected && (
                        <Animated.View
                          style={[
                            styles.pinGlow,
                            { transform: [{ scale: pulse }] },
                          ]}
                        />
                      )}

                      <View
                        style={[
                          styles.pinBase,
                          isSelected && styles.pinSelected,
                        ]}
                      />
                    </View>
                  </Marker>
                );
              })}
            </MapView>
          </View>
        </View>
        </View>

        {/* Preview card section */}
        <View style={styles.carouselContainer}>
          {searchMode === 'restaurant' ? (
            <FlatList
              ref={restaurantListRef}
              data={nearbyRestaurants}
              keyExtractor={(item, index) => item.placeId || String(index)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={SCREEN_WIDTH}
              decelerationRate="fast"
              renderItem={({ item, index }) => {
                const isSelected = index === selectedRestaurantIndex;

                const distanceMiles =
                  userCoords && item.lat && item.lng
                    ? (
                        haversineDistance(
                          userCoords.lat,
                          userCoords.lng,
                          item.lat,
                          item.lng
                        ) * 0.621371
                      ).toFixed(1)
                    : null;
                const cacheKey = `${item.lat},${item.lng}`;
                const eta = etaCache[cacheKey];

                return (
                  <View style={{ width: SCREEN_WIDTH }}>
                    <View style={styles.restaurantCardWrapper}>
                      <View style={styles.restaurantCard}>
                        <View>
                          <Text style={styles.restaurantTitle}>
                            {item.name}
                          </Text>

                          {item.address ? (
                            <Text style={styles.restaurantAddress}>{item.address}</Text>
                          ) : null}

                          <Text style={styles.restaurantEta}>
                            {eta
                              ? `🚗 ${eta.driving || "--"}   🚶 ${eta.walking || "--"}`
                              : "Loading ETA..."}
                          </Text>

                          <Text style={styles.restaurantTags}>
                            {distanceMiles ? `${distanceMiles} mi away` : "Nearby"}
                          </Text>

                          <Text style={styles.restaurantDescription}>
                            Explore the full menu and organ-friendly options.
                          </Text>
                        </View>

                        <View style={styles.organStripRow}>
                          <Text style={styles.organChip}>Organ data available on dish page</Text>
                        </View>

                        <View style={styles.barometerRow}>
                          <View style={styles.barometerPill}>
                            <View
                              style={[
                                styles.barometerFill,
                                { width: `${50 + Math.floor(Math.random() * 40)}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.barometerScore}>
                            {70 + Math.floor(Math.random() * 20)}
                          </Text>
                          <Text style={styles.barometerLabel}>Tummy Barometer™</Text>
                        </View>

                        <Pressable
                          style={styles.viewRestaurantButton}
                          onPress={() => {
                            const address =
                              (item as any).address ||
                              (item as any).formattedAddress ||
                              (item as any).vicinity ||
                              '';

                            const lat =
                              (item as any).lat ??
                              (item as any).latitude ??
                              (item as any).location?.lat ??
                              (item as any).geometry?.location?.lat;

                            const lng =
                              (item as any).lng ??
                              (item as any).longitude ??
                              (item as any).location?.lng ??
                              (item as any).geometry?.location?.lng;

                            router.push({
                              pathname: '/restaurant',
                              params: {
                                placeId: item.placeId,
                                restaurantName: item.name,
                                address,
                                ...(lat != null ? { lat: String(lat) } : {}),
                                ...(lng != null ? { lng: String(lng) } : {}),
                              },
                            });
                          }}
                        >
                          <Text style={styles.viewRestaurantButtonText}>View Restaurant</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              }}
              onMomentumScrollEnd={(e) => {
                if (nearbyRestaurants.length === 0) return;

                const rawIndex = e.nativeEvent.contentOffset.x / SCREEN_WIDTH;
                let index = Math.round(rawIndex);
                if (Number.isNaN(index)) return;

                index = Math.max(0, Math.min(index, nearbyRestaurants.length - 1));

                const item = nearbyRestaurants[index];
                if (!item) return;

                setSelectedRestaurantIndex(index);
                setSelectedPlace({
                  description: item.name,
                  placeId: item.placeId,
                  lat: item.lat,
                  lng: item.lng,
                });

                // Start background prefetching for menu
                if (item.placeId && item.name && item.address) {
                  prefetchMenu(item.placeId, item.name, item.address);
                }
              }}
            />
          ) : (
            <View style={styles.card}>
              <View style={styles.dishImageWrapper}>
                <Image
                  style={styles.dishImage}
                  source={{
                    uri: 'https://via.placeholder.com/600x400.png?text=Dish+Image',
                  }}
                />
              </View>

              <Text style={styles.restaurantName}>{DUMMY_DISH.name}</Text>

              <View style={styles.barometerRow}>
                <View style={styles.barometerPill}>
                  <View style={styles.barometerFill} />
                </View>
                <Text style={styles.barometerScore}>{DUMMY_DISH.barometer}</Text>
                <Text style={styles.barometerLabel}>Tummy Barometer™</Text>
              </View>

              <TouchableOpacity style={styles.ctaButton} onPress={openDish}>
                <Text style={styles.ctaButtonText}>View Dish Details</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const TEAL = '#14b8a6';
const TEAL_DARK = '#0f766e';
const BG = '#05060a';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  mainBody: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  brandTaglineBlock: {
    marginBottom: 8,
  },
  brandTaglineText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  safeArea: {
    backgroundColor: '#020617',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 4,
    backgroundColor: '#020617',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    transform: [{ translateY: 1 }],
  },
  navIconButton: {
    padding: 6,
    borderRadius: 999,
  },
  navIcon: {
    color: '#9ca3af',
  },

  // Search + mode
  searchRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 10,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
    color: '#9ca3af',
  },
  searchInput: {
    flex: 1,
    color: '#f9fafb',
    fontSize: 15,
  },

  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 14,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
    backgroundColor: '#020617',
  },
  modeSegment: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSegmentActive: {
    backgroundColor: TEAL,
  },
  modeSegmentText: {
    fontSize: 12,
    color: '#e5e7eb',
  },
  modeSegmentTextActive: {
    color: '#02131a',
    fontWeight: '600',
  },

  cameraPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    color: '#e5e7eb',
  },

  helperText: {
    fontSize: 12,
    color: '#9a9eb0',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginBottom: 4,
  },
  placesList: {
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a33',
    backgroundColor: '#15151b',
    overflow: 'hidden',
  },
  placeRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a33',
  },
  placeDescription: {
    fontSize: 13,
    color: '#fefefe',
  },
  upgradeCard: {
    marginBottom: 16,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  upgradeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  upgradeSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#9ca3af',
  },
  sectionHeader: {
    marginTop: 10,
    marginBottom: 4,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f9fafb',
  },
  mapContainer: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a33',
    backgroundColor: '#15151b',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#15151b',
    borderWidth: 1,
    borderColor: '#2a2a33',
    padding: 16,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fefefe',
    marginBottom: 4,
  },
  restaurantSubtitle: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 2,
  },
  restaurantLocation: {
    fontSize: 12,
    color: '#777',
    marginBottom: 10,
  },
  organStripRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  organChip: {
    backgroundColor: '#1f1f26',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
    fontSize: 11,
    color: '#ddd',
  },
  barometerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  barometerPill: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#333',
    overflow: 'hidden',
    marginRight: 8,
  },
  barometerFill: {
    width: '70%',
    height: '100%',
    backgroundColor: TEAL,
  },
  barometerScore: {
    color: '#fefefe',
    fontWeight: '700',
    marginRight: 6,
  },
  barometerLabel: {
    fontSize: 11,
    color: '#888',
  },
  ctaButton: {
    marginTop: 8,
    backgroundColor: TEAL,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: BG,
    fontWeight: '700',
    fontSize: 14,
  },
  dishImageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  dishImage: {
    width: '100%',
    height: 160,
  },
  restaurantCardWrapper: {
    width: SCREEN_WIDTH - 32,
    alignSelf: 'center',
  },
  restaurantCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#020617',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2a2a33',
  },
  carouselContainer: {
    width: SCREEN_WIDTH,
    alignSelf: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  restaurantTitle: {
    fontSize: 16,        // smaller
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 2,
  },
  restaurantAddress: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
  restaurantEta: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
  },
  restaurantTags: {
    fontSize: 13,
    color: '#c4c9d4',
    marginBottom: 6,
  },
  restaurantDescription: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 10,
  },
  pinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinGlow: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 211, 153, 0.25)',
  },
  pinBase: {
    width: 16,
    height: 16,
    backgroundColor: '#0d9488',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#065f46',
  },
  pinSelected: {
    width: 18,
    height: 18,
    backgroundColor: '#34d399',
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  searchResultsContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchResultItem: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1f2937',
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f9fafb',
  },
  searchResultAddress: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  viewRestaurantButton: {
    marginTop: 10,
    backgroundColor: TEAL,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewRestaurantButtonText: {
    color: BG,
    fontWeight: '700',
    fontSize: 14,
  },
});
