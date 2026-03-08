import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../config/theme';

export interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    buttons?: AlertButton[];
    onDismiss?: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
    visible,
    title,
    message,
    buttons,
    onDismiss
}) => {
    const defaultButtons: AlertButton[] = [
        { text: 'OK', onPress: onDismiss }
    ];

    const activeButtons = buttons && buttons.length > 0 ? buttons : defaultButtons;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <TouchableWithoutFeedback onPress={onDismiss}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.alertBox}>
                            <Text style={styles.title}>{title}</Text>
                            <Text style={styles.message}>{message}</Text>
                            
                            <View style={[
                                styles.buttonContainer,
                                activeButtons.length === 2 && styles.buttonContainerRow
                            ]}>
                                {activeButtons.map((btn, index) => {
                                    const isCancel = btn.style === 'cancel';
                                    const isDestructive = btn.style === 'destructive';
                                    
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.button,
                                                isCancel ? styles.buttonCancel : 
                                                isDestructive ? styles.buttonDestructive : styles.buttonDefault,
                                                activeButtons.length === 2 && styles.buttonHalf
                                            ]}
                                            onPress={() => {
                                                if (btn.onPress) btn.onPress();
                                                else if (onDismiss) onDismiss();
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[
                                                styles.buttonText,
                                                isCancel && styles.buttonTextCancel
                                            ]}>
                                                {btn.text}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    alertBox: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        width: '100%',
        maxWidth: 400,
        ...SHADOWS.lg,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    title: {
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        fontWeight: TYPOGRAPHY.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    message: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xl,
        textAlign: 'center',
        lineHeight: 24,
    },
    buttonContainer: {
        gap: SPACING.sm,
    },
    buttonContainerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonHalf: {
        flex: 1,
    },
    buttonDefault: {
        backgroundColor: COLORS.organicWaste,
    },
    buttonCancel: {
        backgroundColor: COLORS.backgroundSecondary,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    buttonDestructive: {
        backgroundColor: COLORS.accentDanger,
    },
    buttonText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: '#FFFFFF',
    },
    buttonTextCancel: {
        color: COLORS.textPrimary,
    },
});

export default CustomAlert;
