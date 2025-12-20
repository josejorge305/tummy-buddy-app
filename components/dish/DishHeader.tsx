import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, FONT_SIZES } from './designSystem';

type Props = {
  imageUrl: string | null;
  dishName: string;
  description?: string | null;
  price?: number | string | null;
  restaurantName?: string | null;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
};

function truncateText(text: string, maxLength: number): { truncated: string; isTruncated: boolean } {
  if (!text || text.length <= maxLength) {
    return { truncated: text || '', isTruncated: false };
  }
  const truncated = text.substring(0, maxLength).trim();
  const lastSpace = truncated.lastIndexOf(' ');
  return {
    truncated: (lastSpace > maxLength * 0.7 ? truncated.substring(0, lastSpace) : truncated) + '...',
    isTruncated: true,
  };
}

export const DishHeader: React.FC<Props> = ({
  imageUrl,
  dishName,
  description,
  price,
  restaurantName,
  onFavoritePress,
  isFavorite = false,
}) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { truncated: truncatedDesc, isTruncated: descIsTruncated } = truncateText(description || '', 100);

  return (
    <View style={styles.container}>
      {/* Hero Image */}
      {imageUrl && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.heroImage} />
          <LinearGradient
            colors={['transparent', COLORS.background]}
            style={styles.imageGradient}
          />
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={onFavoritePress}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? COLORS.severityHigh : COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Dish Name - max 2 lines */}
        <Text style={styles.dishName} numberOfLines={2}>
          {dishName}
        </Text>

        {/* Price Line */}
        {price && (
          <Text style={styles.priceText}>
            {typeof price === 'number' ? `$${price}` : price}
          </Text>
        )}

        {/* Description - max 2 lines with "More" to expand */}
        {description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText} numberOfLines={showFullDescription ? undefined : 2}>
              {showFullDescription ? description : truncatedDesc}
            </Text>
            {descIsTruncated && (
              <TouchableOpacity
                onPress={() => setShowFullDescription(!showFullDescription)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.moreText}>
                  {showFullDescription ? 'Less' : 'More'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Restaurant Badge */}
        {restaurantName && (
          <View style={styles.restaurantBadge}>
            <Ionicons name="restaurant-outline" size={14} color={COLORS.brandTeal} />
            <Text style={styles.restaurantName}>{restaurantName}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
  },
  imageContainer: {
    height: 220,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  dishName: {
    ...TYPOGRAPHY.dishTitle,
    marginBottom: SPACING.xs,
  },
  priceText: {
    fontSize: FONT_SIZES.md, // 16px
    fontWeight: '600',
    color: COLORS.brandTeal,
    marginBottom: SPACING.sm,
  },
  descriptionContainer: {
    marginBottom: SPACING.md,
  },
  descriptionText: {
    ...TYPOGRAPHY.body,
  },
  moreText: {
    fontSize: FONT_SIZES.sm, // 14px
    fontWeight: '600',
    color: COLORS.brandTeal,
    marginTop: 4,
  },
  restaurantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(24, 214, 198, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  restaurantName: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textPrimary,
  },
});

export default DishHeader;
