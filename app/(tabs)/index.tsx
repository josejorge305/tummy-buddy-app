import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Pressable,
  Animated,
  Easing,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import BrandTitle from '../../components/BrandTitle';
import {
  fetchPlaceDetails,
  PlaceSuggestion,
} from '../../api/places';
import { API_BASE_URL, getDishSuggestions, DishSuggestion, uploadDishImage } from '../../api/api';
import { useMenuPrefetch } from '../../context/MenuPrefetchContext';
import {
  searchCachedDishes,
  getRecentDishSearches,
  addToRecentDishSearches,
  getCachedDish,
  CachedDish,
  RecentDishSearch,
} from '../../utils/dishCache';

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

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const toRad = (v: number) => (v * Math.PI) / 180;
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

  // Dish search state
  const [dishSearchResults, setDishSearchResults] = useState<CachedDish[]>([]);
  const [apiDishSuggestions, setApiDishSuggestions] = useState<DishSuggestion[]>([]);
  const [recentDishes, setRecentDishes] = useState<RecentDishSearch[]>([]);
  const [recentDishesWithCache, setRecentDishesWithCache] = useState<CachedDish[]>([]);
  const [isDishSearching, setIsDishSearching] = useState(false);
  const [showDishDropdown, setShowDishDropdown] = useState(false);
  const dishSearchTimeout = useRef<NodeJS.Timeout | null>(null);
  const dishListRef = useRef<FlatList<any> | null>(null);
  const [selectedDishIndex, setSelectedDishIndex] = useState(0);

  // Load recent dishes on mount and when switching to dish mode
  useEffect(() => {
    if (searchMode === 'dish') {
      loadRecentDishes();
    }
  }, [searchMode]);

  const loadRecentDishes = async () => {
    const recent = await getRecentDishSearches();
    setRecentDishes(recent);

    // Load full cached data for recent dishes (for carousel with images)
    const dishesWithCache: CachedDish[] = [];
    for (const r of recent) {
      const cached = await getCachedDish(r.dishName);
      if (cached) {
        dishesWithCache.push(cached);
      }
    }
    setRecentDishesWithCache(dishesWithCache);
  };

  // Debounced dish search - searches both local cache AND API for suggestions
  const handleDishSearch = useCallback((text: string) => {
    if (dishSearchTimeout.current) {
      clearTimeout(dishSearchTimeout.current);
    }

    if (!text.trim()) {
      setDishSearchResults([]);
      setApiDishSuggestions([]);
      setShowDishDropdown(false); // Recent dishes now shown in carousel
      return;
    }

    setIsDishSearching(true);
    setShowDishDropdown(true);

    dishSearchTimeout.current = setTimeout(async () => {
      try {
        // Search local cache (instant, previously analyzed dishes)
        const cachedResults = await searchCachedDishes(text);
        setDishSearchResults(cachedResults);

        // Also fetch API suggestions for typo-tolerant matching
        // This runs in parallel and updates when complete
        if (text.trim().length >= 2) {
          const apiResponse = await getDishSuggestions(text.trim(), { limit: 8 });
          if (apiResponse.ok && apiResponse.suggestions.length > 0) {
            // Filter out suggestions that are already in cached results
            const cachedNames = new Set(cachedResults.map(c => c.dishName.toLowerCase()));
            const newSuggestions = apiResponse.suggestions.filter(
              s => !cachedNames.has(s.name.toLowerCase())
            );
            setApiDishSuggestions(newSuggestions);
          } else {
            setApiDishSuggestions([]);
          }
        } else {
          setApiDishSuggestions([]);
        }
      } catch (e) {
        console.error('Dish search error:', e);
        setDishSearchResults([]);
        setApiDishSuggestions([]);
      } finally {
        setIsDishSearching(false);
      }
    }, 300);
  }, [recentDishes]);

  // Handle dish selection from dropdown (cached dish or recent search)
  const handleDishSelect = async (dish: CachedDish | { dishName: string; hasCache: boolean }) => {
    const dishName = 'analysis' in dish ? dish.dishName : dish.dishName;
    const isCached = 'analysis' in dish;

    // Add to recent searches
    await addToRecentDishSearches(dishName, {
      restaurantName: isCached ? (dish as CachedDish).restaurantName : undefined,
      restaurantAddress: isCached ? (dish as CachedDish).restaurantAddress : undefined,
      hasCache: isCached,
    });

    setShowDishDropdown(false);
    setQuery('');
    setApiDishSuggestions([]);

    // Navigate to dish screen
    router.push({
      pathname: '/dish',
      params: {
        dishName,
        ...(isCached && (dish as CachedDish).restaurantName
          ? { restaurantName: (dish as CachedDish).restaurantName }
          : {}),
        ...(isCached && (dish as CachedDish).restaurantAddress
          ? { restaurantAddress: (dish as CachedDish).restaurantAddress }
          : {}),
        ...(isCached && (dish as CachedDish).placeId
          ? { placeId: (dish as CachedDish).placeId }
          : {}),
        ...(isCached && (dish as CachedDish).imageUrl
          ? { imageUrl: (dish as CachedDish).imageUrl }
          : {}),
        fromCache: isCached ? 'true' : 'false',
      },
    });
  };

  // Handle API suggestion selection (typo-corrected dish from server)
  const handleApiSuggestionSelect = async (suggestion: DishSuggestion) => {
    // Add to recent searches with the corrected name
    await addToRecentDishSearches(suggestion.name, { hasCache: false });

    setShowDishDropdown(false);
    setQuery('');
    setApiDishSuggestions([]);

    // Navigate to dish screen with the corrected name
    router.push({
      pathname: '/dish',
      params: {
        dishName: suggestion.name,
        fromCache: 'false',
      },
    });
  };

  // Handle dish search submit (when user types a new dish name)
  const handleDishSearchSubmit = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    // Add to recent and navigate
    await addToRecentDishSearches(trimmed, { hasCache: false });

    setShowDishDropdown(false);
    setQuery('');

    router.push({
      pathname: '/dish',
      params: {
        dishName: trimmed,
        fromCache: 'false',
      },
    });
  };

  const handleSearchSubmit = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    // Handle dish search mode
    if (searchMode === 'dish') {
      handleDishSearchSubmit();
      return;
    }

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
    setSearchResults([]);
    setDishSearchResults([]);
    setShowDishDropdown(false);
    setError(null);
    setQuery('');
  };


  // Photo analysis state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleCameraPress = () => {
    Alert.alert(
      'Analyze Dish Photo',
      'How would you like to add a photo?',
      [
        {
          text: 'Take Photo',
          onPress: () => pickImage('camera'),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => pickImage('gallery'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      // Request permissions
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required to take photos.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Gallery permission is required to select photos.');
          return;
        }
      }

      // Launch camera or gallery
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
            base64: true,
          });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Error', 'Failed to process image. Please try again.');
        return;
      }

      // Directly upload and analyze - backend will auto-detect the dish using GPT-4o vision
      await handlePhotoUpload(asset.base64!, asset.mimeType || 'image/jpeg', asset.uri);

    } catch (err: any) {
      console.error('pickImage error:', err);
      Alert.alert('Error', err?.message || 'Failed to pick image');
    }
  };

  const handlePhotoUpload = async (base64: string, mimeType: string, localUri: string) => {
    setIsUploadingPhoto(true);

    try {
      console.log('Uploading dish photo for auto-detection...');
      const uploadResult = await uploadDishImage(base64, mimeType);

      if (!uploadResult.ok || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      console.log('Photo uploaded:', uploadResult.url);

      // Navigate to dish analysis screen with image URL
      // Backend will auto-detect the dish name using GPT-4o vision
      // URL encode the imageUrl to prevent truncation in router params
      router.push({
        pathname: '/dish',
        params: {
          dishName: 'Photo Analysis', // Placeholder - backend will detect actual dish
          imageUrl: encodeURIComponent(uploadResult.url),
          fromPhoto: 'true',
        },
      });

    } catch (err: any) {
      console.error('handlePhotoUpload error:', err);
      Alert.alert('Upload Failed', err?.message || 'Could not upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
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
            <BrandTitle style={styles.brandTitle} size="medium" showTagline />
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
          {/* Time-based greeting */}
          <View style={styles.greetingBlock}>
            <Text style={styles.greetingText}>
              {(() => {
                const hour = new Date().getHours();
                if (hour < 12) return 'Good morning';
                if (hour < 17) return 'Good afternoon';
                return 'Good evening';
              })()}
            </Text>
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
                placeholder={searchMode === 'dish' ? "Search for dishes (e.g. Margherita Pizza)" : "Search for restaurants or dishes"}
                placeholderTextColor="#b3b8c4"
                value={query}
                onChangeText={(text) => {
                  setQuery(text);
                  setError(null);
                  if (searchMode === 'dish') {
                    handleDishSearch(text);
                  }
                }}
                onFocus={() => {
                  // Dropdown only shows when there's active search, not for recent dishes
                  // Recent dishes are now shown in the carousel below
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

          {searchResults.length > 0 && searchMode === 'restaurant' && (
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

          {/* Dish search dropdown */}
          {searchMode === 'dish' && showDishDropdown && (
            <View style={styles.dishDropdown}>
              {/* Loading indicator */}
              {isDishSearching && (
                <View style={styles.dishDropdownLoading}>
                  <ActivityIndicator size="small" color={TEAL} />
                  <Text style={styles.dishDropdownLoadingText}>Searching...</Text>
                </View>
              )}

              {/* Cached dish results */}
              {!isDishSearching && dishSearchResults.length > 0 && (
                <>
                  <Text style={styles.dishDropdownSectionTitle}>Cached Dishes</Text>
                  {dishSearchResults.slice(0, 5).map((dish, index) => (
                    <TouchableOpacity
                      key={`cached-${dish.normalizedName}-${index}`}
                      style={styles.dishDropdownItem}
                      onPress={() => handleDishSelect(dish)}
                    >
                      <View style={styles.dishDropdownItemContent}>
                        <Text style={styles.dishDropdownItemName}>{dish.dishName}</Text>
                        {dish.restaurantName && (
                          <View style={styles.dishDropdownRestaurantBadge}>
                            <Ionicons name="restaurant-outline" size={12} color={TEAL} />
                            <Text style={styles.dishDropdownRestaurantName}>{dish.restaurantName}</Text>
                          </View>
                        )}
                        {dish.restaurantAddress && (
                          <Text style={styles.dishDropdownAddress} numberOfLines={1}>
                            {dish.restaurantAddress}
                          </Text>
                        )}
                      </View>
                      <View style={styles.dishDropdownCachedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Recent dishes are now shown in the carousel below - removed from dropdown */}

              {/* API suggestions (typo-corrected dishes from server) */}
              {!isDishSearching && query.trim() && apiDishSuggestions.length > 0 && (
                <>
                  <Text style={styles.dishDropdownSectionTitle}>
                    {dishSearchResults.length > 0 ? 'Did you mean...' : 'Suggestions'}
                  </Text>
                  {apiDishSuggestions.slice(0, 5).map((suggestion, index) => (
                    <TouchableOpacity
                      key={`api-${suggestion.id}-${index}`}
                      style={styles.dishDropdownItem}
                      onPress={() => handleApiSuggestionSelect(suggestion)}
                    >
                      <View style={styles.dishDropdownItemContent}>
                        <Text style={styles.dishDropdownItemName}>{suggestion.name}</Text>
                        <View style={styles.dishDropdownSuggestionMeta}>
                          {suggestion.cuisine && (
                            <Text style={styles.dishDropdownCuisineTag}>
                              {suggestion.cuisine}
                            </Text>
                          )}
                          {suggestion.similarity < 1 && (
                            <Text style={styles.dishDropdownMatchScore}>
                              {Math.round(suggestion.similarity * 100)}% match
                            </Text>
                          )}
                        </View>
                      </View>
                      <Ionicons name="sparkles-outline" size={16} color={TEAL} />
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Search prompt when query entered */}
              {!isDishSearching && query.trim() && (
                <TouchableOpacity
                  style={styles.dishDropdownSearchNew}
                  onPress={handleDishSearchSubmit}
                >
                  <Ionicons name="search-outline" size={18} color={TEAL} />
                  <Text style={styles.dishDropdownSearchNewText}>
                    Search for &quot;{query.trim()}&quot;
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={TEAL} />
                </TouchableOpacity>
              )}
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
        </View>

        {/* Premium CTA row – navigates to Profile */}
        <Pressable
          onPress={() => router.push('/profile')}
          style={({ pressed }) => [styles.upgradeCard, pressed && { opacity: 0.8 }]}
        >
          <LinearGradient
            colors={['rgba(20, 184, 166, 0.15)', 'rgba(168, 85, 247, 0.15)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.upgradeGradient}
          >
            <View style={styles.upgradeContent}>
              <View style={styles.upgradeIconContainer}>
                <Ionicons name="sparkles" size={20} color="#a855f7" />
              </View>
              <View style={styles.upgradeTextContainer}>
                <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
                <Text style={styles.upgradeSubtitle}>
                  Unlock detailed organ analytics & meal history.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#6b7280" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* Section header - varies by mode */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {searchMode === 'photo' ? 'Photo Analysis' : searchMode === 'dish' ? 'Recent Dishes' : 'Nearby restaurants'}
          </Text>
        </View>

        {/* Map (restaurant mode only) */}
        {searchMode === 'restaurant' && (
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
        )}

        {/* Preview card section */}
        <View style={styles.carouselContainer}>
          {searchMode === 'photo' ? (
            /* Photo mode - show camera prompt */
            <View style={styles.restaurantCardWrapper}>
              <View style={styles.restaurantCard}>
                <View style={styles.photoModeContainer}>
                  {isUploadingPhoto ? (
                    <>
                      <ActivityIndicator size="large" color={TEAL} />
                      <Text style={styles.photoModeTitle}>Uploading photo...</Text>
                      <Text style={styles.photoModeSubtitle}>
                        Please wait while we process your image
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.photoModeIconContainer}>
                        <Ionicons name="camera" size={64} color={TEAL} />
                      </View>
                      <Text style={styles.photoModeTitle}>Analyze Your Meal</Text>
                      <Text style={styles.photoModeSubtitle}>
                        Take a photo of your dish to get instant nutritional analysis, allergen detection, and health insights
                      </Text>
                      <Pressable
                        style={styles.photoModeButton}
                        onPress={handleCameraPress}
                      >
                        <Ionicons name="camera-outline" size={20} color="#020617" />
                        <Text style={styles.photoModeButtonText}>Take or Select Photo</Text>
                      </Pressable>
                      <View style={styles.photoModeFeatures}>
                        <View style={styles.photoModeFeature}>
                          <Ionicons name="nutrition-outline" size={16} color="#9ca3af" />
                          <Text style={styles.photoModeFeatureText}>Nutrition facts</Text>
                        </View>
                        <View style={styles.photoModeFeature}>
                          <Ionicons name="warning-outline" size={16} color="#9ca3af" />
                          <Text style={styles.photoModeFeatureText}>Allergen alerts</Text>
                        </View>
                        <View style={styles.photoModeFeature}>
                          <Ionicons name="body-outline" size={16} color="#9ca3af" />
                          <Text style={styles.photoModeFeatureText}>Organ impact</Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </View>
          ) : searchMode === 'restaurant' ? (
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
                        {/* Hero Photo Header */}
                        {item.photoUrl ? (
                          <View style={styles.photoHeader}>
                            <Image
                              source={{ uri: item.photoUrl }}
                              style={styles.heroPhoto}
                              contentFit="cover"
                              transition={200}
                            />
                            {/* Gradient scrim overlay */}
                            <LinearGradient
                              colors={['transparent', 'rgba(2, 6, 23, 0.95)']}
                              style={styles.photoScrim}
                            />
                            {/* Name and pills on top of photo */}
                            <View style={styles.photoOverlay}>
                              <Text style={styles.photoTitle} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <View style={styles.photoPillsRow}>
                                {distanceMiles ? (
                                  <View style={styles.photoPill}>
                                    <Text style={styles.photoPillText}>{distanceMiles} mi</Text>
                                  </View>
                                ) : null}
                                {eta?.driving ? (
                                  <View style={styles.photoPill}>
                                    <Text style={styles.photoPillText}>🚗 {eta.driving}</Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          </View>
                        ) : (
                          /* Fallback: No photo - show name in dark header */
                          <View style={styles.noPhotoHeader}>
                            <Text style={styles.restaurantTitle}>
                              {item.name}
                            </Text>
                            <View style={styles.photoPillsRow}>
                              {distanceMiles ? (
                                <View style={styles.photoPill}>
                                  <Text style={styles.photoPillText}>{distanceMiles} mi</Text>
                                </View>
                              ) : null}
                              {eta?.driving ? (
                                <View style={styles.photoPill}>
                                  <Text style={styles.photoPillText}>🚗 {eta.driving}</Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                        )}

                        {/* Card body content */}
                        <View style={styles.cardBody}>
                          {item.address ? (
                            <Text style={styles.restaurantAddress} numberOfLines={2}>{item.address}</Text>
                          ) : null}

                          <Text style={styles.restaurantDescription}>
                            Explore the full menu and organ-friendly options.
                          </Text>

                          {/* Feature badges */}
                          <View style={styles.featureBadgesRow}>
                            <View style={styles.featureBadge}>
                              <Ionicons name="body-outline" size={14} color="#14b8a6" />
                              <Text style={styles.featureBadgeText}>Organ insights</Text>
                            </View>
                            <View style={styles.featureBadge}>
                              <Ionicons name="nutrition-outline" size={14} color="#14b8a6" />
                              <Text style={styles.featureBadgeText}>Nutrition</Text>
                            </View>
                            <View style={styles.featureBadge}>
                              <Ionicons name="warning-outline" size={14} color="#f59e0b" />
                              <Text style={styles.featureBadgeText}>Allergens</Text>
                            </View>
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
          ) : recentDishesWithCache.length > 0 ? (
            /* Recent Dishes Carousel */
            <FlatList
              ref={dishListRef}
              data={recentDishesWithCache}
              keyExtractor={(item, index) => `${item.normalizedName}-${index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={SCREEN_WIDTH}
              decelerationRate="fast"
              renderItem={({ item, index }) => {
                const isSelected = index === selectedDishIndex;
                const analysis = item.analysis;
                const allergenCount = analysis?.allergen_flags?.filter((a: { present?: string }) => a.present === 'yes').length || 0;
                const calories = analysis?.nutrition_summary?.calories;

                return (
                  <View style={{ width: SCREEN_WIDTH }}>
                    <View style={styles.restaurantCardWrapper}>
                      <View style={styles.restaurantCard}>
                        {/* Hero Photo Header */}
                        {(item.imageUrl || analysis?.recipe_image) ? (
                          <View style={styles.photoHeader}>
                            <Image
                              source={{ uri: item.imageUrl || analysis?.recipe_image }}
                              style={styles.heroPhoto}
                              contentFit="cover"
                              transition={200}
                            />
                            {/* Gradient scrim overlay */}
                            <LinearGradient
                              colors={['transparent', 'rgba(2, 6, 23, 0.95)']}
                              style={styles.photoScrim}
                            />
                            {/* Name and pills on top of photo */}
                            <View style={styles.photoOverlay}>
                              <Text style={styles.photoTitle} numberOfLines={1}>
                                {item.dishName}
                              </Text>
                              <View style={styles.photoPillsRow}>
                                {calories ? (
                                  <View style={styles.photoPill}>
                                    <Text style={styles.photoPillText}>{Math.round(calories)} cal</Text>
                                  </View>
                                ) : null}
                                {allergenCount > 0 ? (
                                  <View style={[styles.photoPill, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                                    <Text style={[styles.photoPillText, { color: '#f59e0b' }]}>{allergenCount} allergen{allergenCount > 1 ? 's' : ''}</Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          </View>
                        ) : (
                          /* Fallback: No photo - show name in dark header */
                          <View style={styles.noPhotoHeader}>
                            <Text style={styles.restaurantTitle}>
                              {item.dishName}
                            </Text>
                            <View style={styles.photoPillsRow}>
                              {calories ? (
                                <View style={styles.photoPill}>
                                  <Text style={styles.photoPillText}>{Math.round(calories)} cal</Text>
                                </View>
                              ) : null}
                              {allergenCount > 0 ? (
                                <View style={[styles.photoPill, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                                  <Text style={[styles.photoPillText, { color: '#f59e0b' }]}>{allergenCount} allergen{allergenCount > 1 ? 's' : ''}</Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                        )}

                        {/* Card body content */}
                        <View style={styles.cardBody}>
                          {item.restaurantName ? (
                            <Text style={styles.restaurantAddress} numberOfLines={1}>
                              from {item.restaurantName}
                            </Text>
                          ) : null}

                          <Text style={styles.restaurantDescription}>
                            View full nutrition analysis, organ impact scores, and more.
                          </Text>

                          {/* Feature badges */}
                          <View style={styles.featureBadgesRow}>
                            <View style={styles.featureBadge}>
                              <Ionicons name="body-outline" size={14} color="#14b8a6" />
                              <Text style={styles.featureBadgeText}>Organ insights</Text>
                            </View>
                            <View style={styles.featureBadge}>
                              <Ionicons name="nutrition-outline" size={14} color="#14b8a6" />
                              <Text style={styles.featureBadgeText}>Nutrition</Text>
                            </View>
                            <View style={styles.featureBadge}>
                              <Ionicons name="warning-outline" size={14} color="#f59e0b" />
                              <Text style={styles.featureBadgeText}>Allergens</Text>
                            </View>
                          </View>

                          <Pressable
                            style={styles.viewRestaurantButton}
                            onPress={() => {
                              router.push({
                                pathname: '/dish',
                                params: {
                                  dishName: item.dishName,
                                  ...(item.restaurantName ? { restaurantName: item.restaurantName } : {}),
                                  ...(item.restaurantAddress ? { restaurantAddress: item.restaurantAddress } : {}),
                                  ...(item.placeId ? { placeId: item.placeId } : {}),
                                  ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
                                  fromCache: 'true',
                                },
                              });
                            }}
                          >
                            <Text style={styles.viewRestaurantButtonText}>View Dish Details</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              }}
              onMomentumScrollEnd={(e) => {
                if (recentDishesWithCache.length === 0) return;

                const rawIndex = e.nativeEvent.contentOffset.x / SCREEN_WIDTH;
                let index = Math.round(rawIndex);
                if (Number.isNaN(index)) return;

                index = Math.max(0, Math.min(index, recentDishesWithCache.length - 1));
                setSelectedDishIndex(index);
              }}
            />
          ) : (
            /* Empty state when no recent dishes */
            <View style={styles.card}>
              <View style={styles.emptyDishState}>
                <Ionicons name="restaurant-outline" size={48} color="#4b5563" />
                <Text style={styles.emptyDishTitle}>No recent dishes</Text>
                <Text style={styles.emptyDishSubtitle}>
                  Search for a dish above to get started with nutritional analysis
                </Text>
              </View>
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
  greetingBlock: {
    marginBottom: 12,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f9fafb',
  },
  safeArea: {
    backgroundColor: '#020617',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
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
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  upgradeGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f9fafb',
  },
  upgradeSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#9ca3af',
  },
  sectionHeader: {
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 4,
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
  featureBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  featureBadgeText: {
    fontSize: 12,
    color: '#e5e7eb',
    fontWeight: '500',
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
  emptyDishState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyDishTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  // Photo mode styles
  photoModeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  photoModeIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  photoModeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 8,
    textAlign: 'center',
  },
  photoModeSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  photoModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TEAL,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    gap: 8,
    marginBottom: 24,
  },
  photoModeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020617',
  },
  photoModeFeatures: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  photoModeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoModeFeatureText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyDishSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  restaurantCardWrapper: {
    width: SCREEN_WIDTH - 32,
    alignSelf: 'center',
  },
  restaurantCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#020617',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#2a2a33',
  },
  carouselContainer: {
    width: SCREEN_WIDTH,
    alignSelf: 'center',
    paddingTop: 0,
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
  // Hero photo styles
  photoHeader: {
    position: 'relative',
    height: 140,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
  },
  photoScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  photoOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
  },
  photoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 6,
  },
  photoPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  photoPillText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  noPhotoHeader: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
    marginBottom: 10,
  },
  cardBody: {
    // Container for card content below the hero image
  },
  // Dish search dropdown styles
  dishDropdown: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  dishDropdownLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  dishDropdownLoadingText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  dishDropdownSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  dishDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  dishDropdownItemContent: {
    flex: 1,
  },
  dishDropdownItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 2,
  },
  dishDropdownRestaurantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dishDropdownRestaurantName: {
    fontSize: 12,
    color: TEAL,
  },
  dishDropdownAddress: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  dishDropdownCachedBadge: {
    marginLeft: 8,
  },
  dishDropdownSearchNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 10,
    marginTop: 8,
  },
  dishDropdownSearchNewText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEAL,
    flex: 1,
  },
  dishDropdownSuggestionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  dishDropdownCuisineTag: {
    fontSize: 11,
    color: '#9ca3af',
    textTransform: 'capitalize',
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dishDropdownMatchScore: {
    fontSize: 11,
    color: TEAL,
    fontWeight: '500',
  },
});
