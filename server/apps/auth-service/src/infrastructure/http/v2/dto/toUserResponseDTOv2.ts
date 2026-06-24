import type { UserResponseDTO } from '../../../../application/UserResponseDTO.ts';
import type { UserResponseDTOv2 } from './UserResponseDTOv2.ts';

export function toUserResponseDTOv2(user: UserResponseDTO): UserResponseDTOv2 {
    return {
        id: user.id,
        email: user.email,
        userName: user.userName,
        birthDate: user.birthDate
            ? user.birthDate.toISOString().slice(0, 10)
            : null,
    };
}
