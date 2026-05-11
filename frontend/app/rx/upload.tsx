import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { rxApi } from '@/api/rx';
import type { PrescriptionDetail, RxItem } from '@/types';

type UploadState = 'idle' | 'picked' | 'uploading' | 'done' | 'error';

export default function RxUploadScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [result, setResult] = useState<PrescriptionDetail | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (uri: string) => {
      setUploadState('uploading');
      // 1. Get presigned URL
      const { s3_key, upload_url } = await rxApi.getPresignedUrl();
      // 2. Upload to S3 (mock: skip actual upload in dev)
      // In production: await fetch(upload_url, { method: 'PUT', body: fileBlob })
      // 3. Register with backend
      const rx = await rxApi.upload({ s3_key });
      return rx;
    },
    onSuccess: (data) => {
      setResult(data);
      setUploadState('done');
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    },
    onError: () => {
      setUploadState('error');
    },
  });

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to scan your prescription.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      setUploadState('picked');
      uploadMutation.mutate(uri);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      setUploadState('picked');
      uploadMutation.mutate(uri);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#0C4A6E" />
        </TouchableOpacity>
        <Text style={styles.title}>Upload Prescription</Text>
      </View>

      {/* Upload area */}
      {uploadState === 'idle' && (
        <>
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
            <Text style={styles.infoText}>
              Your prescription is encrypted and stored securely. Only you and the licensed pharmacist can view it.
            </Text>
          </View>

          <TouchableOpacity style={styles.cameraBtn} onPress={pickFromCamera}>
            <Ionicons name="camera-outline" size={40} color="#0EA5E9" />
            <Text style={styles.cameraBtnTitle}>Scan Prescription</Text>
            <Text style={styles.cameraBtnSub}>Use your camera for best results</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
            <Ionicons name="image-outline" size={24} color="#6B7280" />
            <Text style={styles.galleryBtnText}>Choose from Gallery</Text>
          </TouchableOpacity>

          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Tips for a good photo:</Text>
            {[
              'Ensure text is clearly visible',
              'Good lighting, no shadows',
              'Include doctor name & date',
              'Include all pages if multi-page',
            ].map((tip) => (
              <View key={tip} style={styles.tip}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Processing */}
      {uploadState === 'uploading' && (
        <View style={styles.processing}>
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          )}
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color="#0EA5E9" />
            <Text style={styles.processingTitle}>Analyzing Prescription…</Text>
            <Text style={styles.processingText}>
              Our AI is reading medicine names, dosage, and doctor details.
            </Text>
          </View>
        </View>
      )}

      {/* OCR Result */}
      {uploadState === 'done' && result && (
        <View>
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          )}

          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.resultTitle}>Prescription Scanned!</Text>
            </View>

            {result.doctor_name && (
              <View style={styles.docInfo}>
                <Ionicons name="person-outline" size={16} color="#6B7280" />
                <Text style={styles.docText}>{result.doctor_name}</Text>
                {result.hospital_name && (
                  <Text style={styles.docHospital}> · {result.hospital_name}</Text>
                )}
              </View>
            )}

            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>AI Confidence:</Text>
              <View style={styles.confidenceBar}>
                <View
                  style={[
                    styles.confidenceFill,
                    {
                      width: `${(result.ocr_confidence_bps ?? 0) / 100}%` as any,
                      backgroundColor: (result.ocr_confidence_bps ?? 0) > 8000 ? '#10B981' : '#F59E0B',
                    },
                  ]}
                />
              </View>
              <Text style={styles.confidenceValue}>
                {((result.ocr_confidence_bps ?? 0) / 100).toFixed(0)}%
              </Text>
            </View>
          </View>

          {result.items.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detected Medicines ({result.items.length})</Text>
              {result.items.map((item: RxItem) => (
                <View key={item.id} style={styles.medItem}>
                  <Text style={styles.medName}>{item.raw_medicine_name}</Text>
                  <Text style={styles.medDetail}>
                    {[item.dosage, item.frequency, item.duration_days ? `${item.duration_days} days` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {result.flags.length > 0 && (
            <View style={styles.flagBox}>
              <Ionicons name="warning-outline" size={18} color="#F59E0B" />
              <Text style={styles.flagText}>{result.flags[0].description}</Text>
            </View>
          )}

          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push({ pathname: '/(tabs)/search', params: {} })}
            >
              <Text style={styles.primaryBtnText}>Order Medicines</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/rx/vault')}>
              <Text style={styles.secondaryBtnText}>View Rx Vault</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {uploadState === 'error' && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          <Text style={styles.errorTitle}>Upload failed</Text>
          <Text style={styles.errorText}>Please try again with a clearer photo.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setUploadState('idle')}>
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  back: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#0C4A6E' },
  infoBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#ECFDF5',
    borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#A7F3D0',
  },
  infoText: { flex: 1, fontSize: 13, color: '#065F46', lineHeight: 18 },
  cameraBtn: {
    backgroundColor: '#fff', borderRadius: 20, padding: 36,
    alignItems: 'center', marginBottom: 12,
    borderWidth: 2, borderColor: '#BAE6FD', borderStyle: 'dashed',
    shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cameraBtnTitle: { fontSize: 18, fontWeight: '700', color: '#0C4A6E', marginTop: 12 },
  cameraBtnSub: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  galleryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, marginBottom: 24,
  },
  galleryBtnText: { fontSize: 14, color: '#374151', fontWeight: '600' },
  tips: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipText: { fontSize: 13, color: '#4B5563' },
  processing: { alignItems: 'center' },
  preview: {
    width: '100%', height: 200, borderRadius: 14, marginBottom: 16,
    backgroundColor: '#E5E7EB',
  },
  processingCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 24, alignItems: 'center',
    width: '100%', gap: 12,
  },
  processingTitle: { fontSize: 18, fontWeight: '700', color: '#0C4A6E' },
  processingText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  resultCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  resultTitle: { fontSize: 17, fontWeight: '700', color: '#065F46' },
  docInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  docText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  docHospital: { fontSize: 13, color: '#6B7280' },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confidenceLabel: { fontSize: 12, color: '#6B7280', width: 90 },
  confidenceBar: {
    flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden',
  },
  confidenceFill: { height: '100%', borderRadius: 3 },
  confidenceValue: { fontSize: 12, fontWeight: '700', color: '#374151', width: 36 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0C4A6E', marginBottom: 8 },
  medItem: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#0EA5E9',
  },
  medName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  medDetail: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  flagBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  flagText: { flex: 1, fontSize: 13, color: '#92400E' },
  resultActions: { gap: 10 },
  primaryBtn: {
    backgroundColor: '#0EA5E9', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    backgroundColor: '#F0F9FF', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  secondaryBtnText: { color: '#0EA5E9', fontWeight: '600', fontSize: 14 },
  errorBox: { alignItems: 'center', paddingTop: 40, gap: 12 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  errorText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});
